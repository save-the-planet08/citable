// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Leaf} from "./Leaf.sol";

/// @title CitableRegistry
/// @notice Register für Merkle-Wurzeln von Aussagen, mit Positionsbeweis.
/// @dev Speichert keinen Text. Volltext, Segmente und Vektoren liegen im IPFS-Bündel,
///      an das die CID bindet — siehe CONCEPT.md.
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

    event StatementRegistered(
        bytes32 indexed root, address indexed author, bytes32 indexed ensNode, uint32 segmentCount, string cid
    );

    event StatementWithdrawn(bytes32 indexed root, uint64 at);

    error AlreadyRegistered();
    error EmptyStatement();
    error NotAuthor();
    error UnknownStatement();

    // ---------------------------------------------------------------
    // Schreiben
    // ---------------------------------------------------------------

    /// @notice Trägt eine Aussage ein. Jeder darf registrieren.
    /// @dev `ensNode` wird NICHT geprüft — das leistet erst die ENS-Schicht.
    function registerRoot(bytes32 root, bytes32 ensNode, string calldata cid, uint32 segmentCount) external {
        if (statements[root].timestamp != 0) revert AlreadyRegistered();
        if (segmentCount == 0) revert EmptyStatement();

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

    /// @notice Der Autor kann eine Aussage als zurückgezogen markieren.
    /// @dev Beweise bleiben gültig. Zurückziehen ist Metadaten, kein Löschen —
    ///      sonst könnte ein Autor unbequeme Zitate nachträglich entwerten.
    function withdrawStatement(bytes32 root) external {
        Statement storage s = statements[root];
        if (s.timestamp == 0) revert UnknownStatement();
        if (s.author != msg.sender) revert NotAuthor();
        s.withdrawn = true;
        emit StatementWithdrawn(root, uint64(block.timestamp));
    }

    // ---------------------------------------------------------------
    // Lesen
    // ---------------------------------------------------------------

    /// @notice Blattberechnung, öffentlich abrufbar.
    /// @dev Existiert, damit das Frontend seine JS-Implementierung gegen die Kette prüfen kann.
    function leafOf(uint256 index, string calldata segment) public pure returns (bytes32) {
        return Leaf.leafOf(index, segment);
    }

    /// @notice Beweist, dass `segment` an Position `index` in der Aussage `root` stand.
    /// @dev Prüft `withdrawn` bewusst nicht. Gibt false statt zu reverten — das Frontend
    ///      unterscheidet die Fälle über getStatement().
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
