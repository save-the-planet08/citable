// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CitableRegistry} from "../src/CitableRegistry.sol";

/// @notice Beweist, dass ein im Client erzeugter Merkle-Beweis vom Contract akzeptiert
///         wird. Die Blattformel allein reicht als Brücke nicht: Segmentierung,
///         Baumaufbau und Paarsortierung müssen ebenfalls übereinstimmen, sonst ist
///         jeder Beweis aus dem Frontend wertlos. Braucht `ffi = true` und `npm install`.
contract ProofBridgeTest is Test {
    CitableRegistry registry;

    address author = makeAddr("author");
    bytes32 ensNode = keccak256("anna.wochenzeitung.eth");
    string constant CID = "bafkreigh2akiscaildc";

    /// @dev Fünf Absätze: ungerade Blattzahl, damit die Baumseite mitgeprüft wird.
    ///      Leerzeilen und Ränder sind absichtlich unsauber — die Segmentierungsregel
    ///      muss sie wegräumen, und zwar in JS genauso wie hier erwartet.
    string constant TEXT = unicode"  Wurden die Zahlen manipuliert? Diese Frage stellt sich seit Monaten.\n"
        unicode"\n" unicode"Der Vorstand weist die Vorwürfe zurück.\n" unicode"\n" unicode"\n"
        unicode"Im vergangenen Quartal stieg der Umsatz um vier Prozent.\n" unicode"\n"
        unicode"   \n" unicode"\n" unicode"Eine Prüfung ist für Oktober angekündigt.\n" unicode"\n"
        unicode"Zitat ohne Kontext 🤡 bleibt Desinformation — ÄÖÜ ß, 你好.  ";

    string[5] segments = [
        unicode"Wurden die Zahlen manipuliert? Diese Frage stellt sich seit Monaten.",
        unicode"Der Vorstand weist die Vorwürfe zurück.",
        unicode"Im vergangenen Quartal stieg der Umsatz um vier Prozent.",
        unicode"Eine Prüfung ist für Oktober angekündigt.",
        unicode"Zitat ohne Kontext 🤡 bleibt Desinformation — ÄÖÜ ß, 你好."
    ];

    function setUp() public {
        registry = new CitableRegistry();
    }

    /// @dev Ruft die Client-Bibliothek auf und liefert, was ein Frontend liefern würde.
    function _clientProof(uint256 index)
        internal
        returns (bytes32 root, uint256 segmentCount, bytes32[] memory proof)
    {
        string[] memory cmd = new string[](4);
        cmd[0] = "node";
        cmd[1] = "script/js/tree.mjs";
        cmd[2] = vm.toString(index);
        cmd[3] = TEXT;
        return abi.decode(vm.ffi(cmd), (bytes32, uint256, bytes32[]));
    }

    /// @notice Der Kern: Der Client segmentiert genauso wie hier erwartet.
    function test_ClientSegmentsTheSameWay() public {
        (,uint256 segmentCount,) = _clientProof(0);
        assertEq(segmentCount, segments.length);
    }

    /// @notice Jeder Beweis aus dem Client wird vom Contract akzeptiert.
    function test_ClientProofsVerifyOnChain() public {
        for (uint256 i = 0; i < segments.length; i++) {
            (bytes32 root, uint256 segmentCount, bytes32[] memory proof) = _clientProof(i);

            if (i == 0) {
                vm.prank(author);
                registry.registerRoot(root, ensNode, CID, uint32(segmentCount));
            }

            assertTrue(registry.verifySegment(root, i, segments[i], proof), "client proof rejected");
        }
    }

    /// @notice Positionsbeweis, nicht bloß Mitgliedschaft: derselbe Absatz, falscher Index.
    function test_ClientProofFailsAtWrongIndex() public {
        (bytes32 root, uint256 segmentCount, bytes32[] memory proof) = _clientProof(1);

        vm.prank(author);
        registry.registerRoot(root, ensNode, CID, uint32(segmentCount));

        assertFalse(registry.verifySegment(root, 2, segments[1], proof));
    }

    /// @notice Ein geändertes Zeichen fällt durch.
    function test_ClientProofFailsForAlteredSegment() public {
        (bytes32 root, uint256 segmentCount, bytes32[] memory proof) = _clientProof(2);

        vm.prank(author);
        registry.registerRoot(root, ensNode, CID, uint32(segmentCount));

        assertFalse(
            registry.verifySegment(
                root, 2, unicode"Im vergangenen Quartal stieg der Umsatz um vierzig Prozent.", proof
            )
        );
    }
}
