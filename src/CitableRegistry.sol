// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {INameGuard} from "./INameGuard.sol";
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

    /// @notice Prüft die Namensberechtigung beim Registrieren.
    /// @dev `address(0)` heißt: keine Prüfung. Das ist das Verhalten vor der ENS-Schicht
    ///      und bleibt der Ausgangszustand nach dem Deploy, bis der Guard gesetzt wird.
    INameGuard public nameGuard;

    /// @notice Darf den Guard setzen. Kein Transfer, kein Renounce — bewusst klein.
    /// @dev Bekannte Zentralisierung: Wer das ist, kann die Namensprüfung abschalten.
    ///      Bereits eingetragene Aussagen ändert das nicht, und Beweise bleiben gültig —
    ///      der Guard entscheidet nur, wer künftig einen Namen behaupten darf.
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
    // Schreiben
    // ---------------------------------------------------------------

    /// @notice Trägt eine Aussage ein.
    /// @dev Ist kein Guard gesetzt, darf jeder jeden Namen behaupten — `ensNode` ist dann
    ///      unbelegte Metadatenangabe. Mit Guard revertet der Aufruf mit `NotAuthorized`.
    ///
    ///      `segmentCount` ist eine Angabe des Autors und wird NICHT gegen den Baum
    ///      geprüft — aus einer Wurzel lässt sich die Blattzahl nicht zurückrechnen. Sie
    ///      dient nur der Bereichsprüfung in `verifySegment`. Die belastbare Zahl steht im
    ///      IPFS-Bündel: Wer es gegen die Wurzel prüft (`verifyBundle`), hat *n* bewiesen.
    ///      Das Frontend zeigt darum "Absatz i von n" aus dem Bündel, nie aus diesem Feld.
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

    /// @notice Setzt oder entfernt die Namensprüfung.
    /// @dev Getrennt vom Konstruktor, weil der Guard die Registry-Adresse noch nicht
    ///      kennen kann, wenn die Registry gerade erst entsteht.
    ///
    ///      Eine Adresse ohne Code würde jedes `registerRoot` reverten lassen — der
    ///      Aufruf an `mayPublish` scheitert dann an der Codeprüfung des Compilers. Ein
    ///      Vertipper legt also die ganze Registry lahm, deshalb hier abgefangen.
    function setNameGuard(INameGuard guard) external {
        if (msg.sender != owner) revert NotOwner();
        if (address(guard) != address(0) && address(guard).code.length == 0) revert GuardWithoutCode();
        nameGuard = guard;
        emit NameGuardChanged(address(guard));
    }

    /// @notice Der Autor kann eine Aussage als zurückgezogen markieren.
    /// @dev Beweise bleiben gültig. Zurückziehen ist Metadaten, kein Löschen —
    ///      sonst könnte ein Autor unbequeme Zitate nachträglich entwerten.
    function withdrawStatement(bytes32 root) external {
        Statement storage s = statements[root];
        if (s.timestamp == 0) revert UnknownStatement();
        if (s.author != msg.sender) revert NotAuthor();
        if (s.withdrawn) revert AlreadyWithdrawn();
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
