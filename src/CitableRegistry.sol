// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {INameGuard} from "./INameGuard.sol";
import {Leaf} from "./Leaf.sol";

/// @title CitableRegistry
/// @notice Registry for merkle roots of statements, with position proofs.
/// @dev Stores no text. Full text, segments and vectors live in the IPFS bundle the CID
///      binds to — see CONCEPT.md.
contract CitableRegistry {
    struct Statement {
        address author;
        bytes32 ensNode;
        uint64 timestamp;
        uint32 segmentCount;
        bool withdrawn;
        string cid;
    }

    mapping(bytes32 root => Statement) public statements;
    mapping(address author => bytes32[] roots) private _rootsByAuthor;

    uint256 public statementCount;

    /// @notice Checks the name authorisation when registering.
    /// @dev `address(0)` means: no check. That is the behaviour from before the ENS layer
    ///      and stays the initial state after deployment until the guard is set.
    INameGuard public nameGuard;

    /// @notice May set the guard. No transfer, no renounce — deliberately small.
    /// @dev Known centralisation: whoever this is can switch the name check off. It does
    ///      not change statements already recorded, and proofs stay valid — the guard only
    ///      decides who may claim a name from here on.
    address public immutable owner;

    event StatementRegistered(
        bytes32 indexed root, address indexed author, bytes32 indexed ensNode, uint32 segmentCount, string cid
    );

    event StatementWithdrawn(bytes32 indexed root, uint64 at);

    event NameGuardChanged(address indexed guard);

    error AlreadyRegistered();
    error AlreadyWithdrawn();
    error EmptyStatement();
    error EmptyRoot();
    error GuardWithoutCode();
    error NotAuthor();
    error NotAuthorized();
    error NotOwner();
    error UnknownStatement();

    constructor() {
        owner = msg.sender;
    }

    // ---------------------------------------------------------------
    // Writing
    // ---------------------------------------------------------------

    /// @notice Records a statement.
    /// @dev With no guard set, anyone may claim any name — `ensNode` is then unbacked
    ///      metadata. With a guard, the call reverts with `NotAuthorized`.
    ///
    ///      `segmentCount` is a claim by the author and is NOT checked against the tree —
    ///      the leaf count cannot be derived from a root. It only serves the range check in
    ///      `verifySegment`. The dependable number lives in the IPFS bundle: whoever checks
    ///      it against the root (`verifyBundle`) has proven *n*. The frontend therefore
    ///      shows "paragraph i of n" from the bundle, never from this field.
    function registerRoot(bytes32 root, bytes32 ensNode, string calldata cid, uint32 segmentCount) external {
        if (root == bytes32(0)) revert EmptyRoot();
        if (statements[root].timestamp != 0) revert AlreadyRegistered();
        if (segmentCount == 0) revert EmptyStatement();

        INameGuard guard = nameGuard;
        if (address(guard) != address(0) && !guard.mayPublish(ensNode, msg.sender)) revert NotAuthorized();

        statements[root] = Statement({
            author: msg.sender,
            ensNode: ensNode,
            timestamp: uint64(block.timestamp),
            segmentCount: segmentCount,
            withdrawn: false,
            cid: cid
        });

        _rootsByAuthor[msg.sender].push(root);
        unchecked {
            ++statementCount;
        }

        emit StatementRegistered(root, msg.sender, ensNode, segmentCount, cid);
    }

    /// @notice Sets or removes the name check.
    /// @dev Separate from the constructor because the guard cannot know the registry
    ///      address yet while the registry is still being created.
    ///
    ///      An address without code would make every `registerRoot` revert — the call to
    ///      `mayPublish` then fails the compiler's code check. A typo would take the whole
    ///      registry down, hence the guard against it here.
    function setNameGuard(INameGuard guard) external {
        if (msg.sender != owner) revert NotOwner();
        if (address(guard) != address(0) && address(guard).code.length == 0) revert GuardWithoutCode();
        nameGuard = guard;
        emit NameGuardChanged(address(guard));
    }

    /// @notice The author can mark a statement as withdrawn.
    /// @dev Proofs stay valid. Withdrawing is metadata, not deletion — otherwise an author
    ///      could devalue inconvenient quotes after the fact.
    function withdrawStatement(bytes32 root) external {
        Statement storage s = statements[root];
        if (s.timestamp == 0) revert UnknownStatement();
        if (s.author != msg.sender) revert NotAuthor();
        if (s.withdrawn) revert AlreadyWithdrawn();
        s.withdrawn = true;
        emit StatementWithdrawn(root, uint64(block.timestamp));
    }

    // ---------------------------------------------------------------
    // Reading
    // ---------------------------------------------------------------

    /// @notice Leaf computation, publicly callable.
    /// @dev Exists so the frontend can check its JS implementation against the chain.
    function leafOf(uint256 index, string calldata segment) public pure returns (bytes32) {
        return Leaf.leafOf(index, segment);
    }

    /// @notice Proves that `segment` stood at position `index` in the statement `root`.
    /// @dev Deliberately does not check `withdrawn`. Returns false instead of reverting —
    ///      the frontend tells the cases apart via getStatement().
    function verifySegment(bytes32 root, uint256 index, string calldata segment, bytes32[] calldata proof)
        external
        view
        returns (bool)
    {
        Statement storage s = statements[root];
        if (s.timestamp == 0) return false;
        if (index >= s.segmentCount) return false;
        return MerkleProof.verify(proof, root, Leaf.leafOf(index, segment));
    }

    function getStatement(bytes32 root) external view returns (Statement memory) {
        return statements[root];
    }

    function rootsByAuthor(address author) external view returns (bytes32[] memory) {
        return _rootsByAuthor[author];
    }
}
