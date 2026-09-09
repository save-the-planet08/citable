// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CitableRegistry} from "../src/CitableRegistry.sol";
import {ENSv2NameGuard, IENSv2Registry} from "../src/ENSv2NameGuard.sol";

/// @notice Der Guard gegen die echte ENSv2-Registry auf Sepolia. Der Name kommt nicht
///         aus dieser Datei, sondern aus `script/js/ens-name.mjs`, das eine gerade
///         gültige Registrierung aus den Mint-Ereignissen sucht — ein fest eingetragener
///         Name wäre in ein paar Wochen abgelaufen und der Test grün aus dem falschen
///         Grund.
///
///         Ohne `SEPOLIA_RPC_URL` überspringt die Datei sich selbst, damit `forge test`
///         offline durchläuft.
contract ENSv2NameGuardForkTest is Test {
    /// @dev Aus https://docs.ens.domains/learn/deployments/, bestätigt von script/js/ens-probe.mjs.
    address constant ETH_REGISTRY = 0xBDC85dD5b15D7ecb354cd7cb6f2c50b4f2c4F0E2;

    /// @dev RegistryRolesLib.ROLE_SET_RESOLVER. Jede .eth-Registrierung auf Sepolia gibt
    ///      dem Inhaber diese Rolle samt Admin-Bit — er kann sie also an eine Redaktion
    ///      weiterreichen. Ein eigenes Rollen-Bit ginge nicht: Admin-Rollen vergibt
    ///      ENSv2 nur bei der Registrierung.
    uint256 constant ROLE_SET_RESOLVER = 1 << 24;

    ENSv2NameGuard guard;

    bool forked;
    bytes32 ensNode;
    address holder;
    uint256 holderRoles;

    address stranger = makeAddr("stranger");

    function setUp() public {
        string memory rpcUrl = vm.envOr("SEPOLIA_RPC_URL", string(""));
        if (bytes(rpcUrl).length == 0) return;

        vm.createSelectFork(rpcUrl);
        forked = true;

        string[] memory cmd = new string[](2);
        cmd[0] = "node";
        cmd[1] = "script/js/ens-name.mjs";
        (ensNode, holder, holderRoles) = abi.decode(vm.ffi(cmd), (bytes32, address, uint256));

        guard = new ENSv2NameGuard(IENSv2Registry(ETH_REGISTRY), ROLE_SET_RESOLVER);
    }

    modifier onlyFork() {
        if (!forked) {
            vm.skip(true);
            return;
        }
        _;
    }

    function test_HolderMayPublish() public onlyFork {
        assertTrue(guard.mayPublish(ensNode, holder));
    }

    function test_StrangerMayNot() public onlyFork {
        assertFalse(guard.mayPublish(ensNode, stranger));
    }

    /// @notice Die Delegation ist auf dieser Kette wirklich möglich — der Inhaber hält
    ///         das Admin-Bit zur Publikationsrolle und kann sie vergeben. Ohne das wäre
    ///         der Volontär-Fall eine Behauptung.
    function test_HolderCanDelegateThePublishRole() public onlyFork {
        assertTrue(holderRoles & ROLE_SET_RESOLVER == ROLE_SET_RESOLVER, "holder lacks the role");
        assertTrue(holderRoles & (ROLE_SET_RESOLVER << 128) != 0, "holder cannot grant the role");
    }

    /// @notice "ens" ist auf Sepolia RESERVED: Ablauf und Resolver gesetzt, nie ein Token
    ///         geprägt. Ein Guard, der nur auf den Resolver schaute, ließe es durch.
    function test_ReservedNameHasNoPublisher() public onlyFork {
        bytes32 reserved = keccak256(bytes("ens"));
        assertFalse(guard.mayPublish(reserved, holder));
        assertFalse(guard.mayPublish(reserved, stranger));
    }

    /// @notice Der ganze Weg: Registry mit gesetztem Guard gegen die echte Kette.
    function test_RegistryAcceptsHolderAndRejectsStranger() public onlyFork {
        CitableRegistry registry = new CitableRegistry();
        registry.setNameGuard(guard);

        vm.prank(holder);
        registry.registerRoot(keccak256("root-a"), ensNode, "bafkreigh2akiscaildc", 4);
        assertEq(registry.getStatement(keccak256("root-a")).author, holder);

        vm.prank(stranger);
        vm.expectRevert(CitableRegistry.NotAuthorized.selector);
        registry.registerRoot(keccak256("root-b"), ensNode, "bafkreigh2akiscaildc", 4);
    }
}
