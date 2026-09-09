// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CitableRegistry} from "../src/CitableRegistry.sol";
import {Leaf} from "../src/Leaf.sol";

contract CitableRegistryTest is Test {
    CitableRegistry registry;

    address author = makeAddr("author");
    address stranger = makeAddr("stranger");
    bytes32 ensNode = keccak256("anna.wochenzeitung.eth");
    string constant CID = "bafkreigh2akiscaildc";

    string[4] segments = [
        unicode"Wurden die Zahlen manipuliert? Diese Frage stellt sich seit Monaten.",
        unicode"Der Vorstand weist die Vorwürfe zurück.",
        unicode"Im vergangenen Quartal stieg der Umsatz um vier Prozent.",
        unicode"Eine Prüfung ist für Oktober angekündigt."
    ];

    bytes32 root;
    bytes32[] proofForOne;

    function setUp() public {
        registry = new CitableRegistry();

        bytes32 l0 = Leaf.leafOf(0, segments[0]);
        bytes32 l1 = Leaf.leafOf(1, segments[1]);
        bytes32 l2 = Leaf.leafOf(2, segments[2]);
        bytes32 l3 = Leaf.leafOf(3, segments[3]);

        bytes32 n01 = _hashPair(l0, l1);
        bytes32 n23 = _hashPair(l2, l3);
        root = _hashPair(n01, n23);

        // Segment 1 hängt links unten: Geschwister ist l0, dann der rechte Teilbaum.
        proofForOne.push(l0);
        proofForOne.push(n23);
    }

    /// @dev OpenZeppelins MerkleProof sortiert Paare vor dem Hashen. Der Baum muss das auch.
    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
    }

    function _register() internal {
        vm.prank(author);
        registry.registerRoot(root, ensNode, CID, 4);
    }

    // ---------------------------------------------------------------
    // Schreiben
    // ---------------------------------------------------------------

    function test_RegisterRoot() public {
        vm.expectEmit(true, true, true, true);
        emit CitableRegistry.StatementRegistered(root, author, ensNode, 4, CID);
        _register();

        CitableRegistry.Statement memory s = registry.getStatement(root);
        assertEq(s.author, author);
        assertEq(s.ensNode, ensNode);
        assertEq(s.segmentCount, 4);
        assertEq(s.cid, CID);
        assertFalse(s.withdrawn);
        assertEq(registry.statementCount(), 1);
        assertEq(registry.rootsByAuthor(author)[0], root);
    }

    function test_RevertWhen_AlreadyRegistered() public {
        _register();
        vm.prank(stranger);
        vm.expectRevert(CitableRegistry.AlreadyRegistered.selector);
        registry.registerRoot(root, ensNode, CID, 4);
    }

    function test_RevertWhen_EmptyStatement() public {
        vm.prank(author);
        vm.expectRevert(CitableRegistry.EmptyStatement.selector);
        registry.registerRoot(root, ensNode, CID, 0);
    }

    /// @notice Die Nullwurzel ist kein gültiger Eintrag — sonst stünde ein Platzhalter
    ///         im Register, den niemand belegen kann.
    function test_RevertWhen_EmptyRoot() public {
        vm.prank(author);
        vm.expectRevert(CitableRegistry.EmptyRoot.selector);
        registry.registerRoot(bytes32(0), ensNode, CID, 4);
    }

    function test_RevertWhen_NotAuthor() public {
        _register();
        vm.prank(stranger);
        vm.expectRevert(CitableRegistry.NotAuthor.selector);
        registry.withdrawStatement(root);
    }

    // ---------------------------------------------------------------
    // Beweis
    // ---------------------------------------------------------------

    function test_VerifySegment_ValidProof() public {
        _register();
        assertTrue(registry.verifySegment(root, 1, segments[1], proofForOne));
    }

    /// @notice Der wichtigste Test: richtiges Segment, falsche Position → kein Beweis.
    ///         Ohne ihn wäre der Positionsbeweis eine Behauptung.
    function test_RevertWhen_WrongIndex() public {
        _register();
        assertFalse(registry.verifySegment(root, 2, segments[1], proofForOne));
    }

    function test_VerifySegment_UnknownRoot() public view {
        assertFalse(registry.verifySegment(bytes32(uint256(1)), 1, segments[1], proofForOne));
    }

    function test_VerifySegment_IndexOutOfRange() public {
        _register();
        assertFalse(registry.verifySegment(root, 4, segments[1], proofForOne));
    }

    /// @notice Zurückgezogen heißt nicht ungültig — sonst könnte ein Autor rückwirkend
    ///         beweisen, er habe etwas nie gesagt.
    function test_WithdrawnStatementStillVerifies() public {
        _register();
        vm.prank(author);
        registry.withdrawStatement(root);

        assertTrue(registry.getStatement(root).withdrawn);
        assertTrue(registry.verifySegment(root, 1, segments[1], proofForOne));
    }

    /// @notice Zweimal zurückziehen ist kein Zustandswechsel — sonst stünden doppelte
    ///         Ereignisse im Verlauf.
    function test_RevertWhen_WithdrawnTwice() public {
        _register();
        vm.startPrank(author);
        registry.withdrawStatement(root);
        vm.expectRevert(CitableRegistry.AlreadyWithdrawn.selector);
        registry.withdrawStatement(root);
        vm.stopPrank();
    }

    /// @notice `segmentCount` ist eine Behauptung des Autors, keine bewiesene Zahl: aus
    ///         der Wurzel lässt sich die Blattzahl nicht zurückrechnen. Die Registry
    ///         nimmt hier eine falsche Zahl an — bewiesen wird *n* erst durch das
    ///         Bündel gegen die Wurzel. Der Test hält das Verhalten fest, damit es
    ///         niemand für eine Prüfung hält.
    function test_SegmentCountIsUnverified() public {
        vm.prank(author);
        registry.registerRoot(root, ensNode, CID, type(uint32).max);
        assertEq(registry.getStatement(root).segmentCount, type(uint32).max);
        assertTrue(registry.verifySegment(root, 1, segments[1], proofForOne));
    }

    function test_LeafOfMatchesLibrary() public view {
        assertEq(registry.leafOf(1, segments[1]), Leaf.leafOf(1, segments[1]));
    }
}
