// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CitableRegistry} from "../src/CitableRegistry.sol";
import {ENSv2NameGuard, IENSv2Registry} from "../src/ENSv2NameGuard.sol";

/// @dev Nachbau der ENSv2-Registry, so weit der Guard sie befragt. Prüft die Logik des
///      Guards; ob die Registry sich draußen wirklich so verhält, prüft der Fork-Test.
contract MockENSv2Registry is IENSv2Registry {
    mapping(uint256 anyId => address) public owners;
    mapping(uint256 anyId => mapping(address account => uint256)) public roleBitmaps;

    function setOwner(uint256 anyId, address account) external {
        owners[anyId] = account;
    }

    function setRoles(uint256 anyId, address account, uint256 bitmap) external {
        roleBitmaps[anyId][account] = bitmap;
    }

    function getOwner(uint256 anyId) external view returns (address) {
        return owners[anyId];
    }

    function roles(uint256 anyId, address account) external view returns (uint256) {
        return roleBitmaps[anyId][account];
    }
}

contract ENSv2NameGuardTest is Test {
    /// @dev RegistryRolesLib.ROLE_SET_RESOLVER — Nybble 6.
    uint256 constant ROLE_SET_RESOLVER = 1 << 24;
    uint256 constant ROLE_RENEW = 1 << 16;

    MockENSv2Registry ens;
    ENSv2NameGuard guard;

    address publisher = makeAddr("publisher");
    address volunteer = makeAddr("volunteer");
    address stranger = makeAddr("stranger");
    address registrar = makeAddr("registrar");

    bytes32 name = keccak256("wochenzeitung");
    bytes32 unregistered = keccak256("gibtesnicht");

    function setUp() public {
        ens = new MockENSv2Registry();
        guard = new ENSv2NameGuard(IENSv2Registry(address(ens)), ROLE_SET_RESOLVER);
        ens.setOwner(uint256(name), publisher);
    }

    // ---------------------------------------------------------------
    // Konstruktor
    // ---------------------------------------------------------------

    function test_Constructor() public view {
        assertEq(address(guard.REGISTRY()), address(ens));
        assertEq(guard.PUBLISH_ROLE(), ROLE_SET_RESOLVER);
    }

    function test_RevertWhen_ZeroRegistry() public {
        vm.expectRevert(ENSv2NameGuard.ZeroRegistry.selector);
        new ENSv2NameGuard(IENSv2Registry(address(0)), ROLE_SET_RESOLVER);
    }

    function test_RevertWhen_ZeroRole() public {
        vm.expectRevert(ENSv2NameGuard.ZeroRole.selector);
        new ENSv2NameGuard(IENSv2Registry(address(ens)), 0);
    }

    // ---------------------------------------------------------------
    // Besitz
    // ---------------------------------------------------------------

    function test_OwnerMayPublish() public view {
        assertTrue(guard.mayPublish(name, publisher));
    }

    function test_StrangerMayNot() public view {
        assertFalse(guard.mayPublish(name, stranger));
    }

    /// @notice Kein Inhaber heißt: frei, reserviert oder abgelaufen. Auf Sepolia ist
    ///         "ens" genau das — Resolver gesetzt, nie ein Token geprägt.
    function test_UnregisteredNameMayNot() public view {
        assertFalse(guard.mayPublish(unregistered, publisher));
    }

    function test_ZeroAccountMayNot() public view {
        assertFalse(guard.mayPublish(name, address(0)));
    }

    /// @notice Läuft der Name ab, gibt ENSv2 `address(0)` zurück — und das Recht endet.
    function test_ExpiredNameMayNot() public {
        ens.setOwner(uint256(name), address(0));
        assertFalse(guard.mayPublish(name, publisher));
    }

    // ---------------------------------------------------------------
    // Delegierte Rolle — der eigentliche Grund für ENS
    // ---------------------------------------------------------------

    /// @notice Der Volontär veröffentlicht unter dem Namen der Zeitung, ohne ihn zu
    ///         besitzen. Ohne diesen Fall wäre ENS hier Dekoration.
    function test_RoleHolderMayPublish() public {
        assertFalse(guard.mayPublish(name, volunteer));
        ens.setRoles(uint256(name), volunteer, ROLE_SET_RESOLVER);
        assertTrue(guard.mayPublish(name, volunteer));
    }

    function test_AnotherRoleIsNotEnough() public {
        ens.setRoles(uint256(name), volunteer, ROLE_RENEW);
        assertFalse(guard.mayPublish(name, volunteer));
    }

    function test_RoleAmongOthersIsEnough() public {
        ens.setRoles(uint256(name), volunteer, ROLE_RENEW | ROLE_SET_RESOLVER);
        assertTrue(guard.mayPublish(name, volunteer));
    }

    /// @notice Die Rolle gilt pro Name.
    function test_RoleDoesNotCarryToAnotherName() public {
        bytes32 other = keccak256("anderes-blatt");
        ens.setOwner(uint256(other), stranger);
        ens.setRoles(uint256(name), volunteer, ROLE_SET_RESOLVER);
        assertFalse(guard.mayPublish(other, volunteer));
    }

    /// @notice Wird die Rolle entzogen, endet das Recht sofort.
    function test_RevokedRoleEndsTheRight() public {
        ens.setRoles(uint256(name), volunteer, ROLE_SET_RESOLVER);
        ens.setRoles(uint256(name), volunteer, 0);
        assertFalse(guard.mayPublish(name, volunteer));
    }

    /// @notice `roles` statt `hasRoles`: Wer die Rolle in der ROOT_RESOURCE hält, darf
    ///         damit nicht unter jedem fremden Namen veröffentlichen.
    function test_RootRoleHolderIsNotAPublisher() public {
        ens.setRoles(0, registrar, ROLE_SET_RESOLVER);
        assertFalse(guard.mayPublish(name, registrar));
    }

    // ---------------------------------------------------------------
    // Zusammenspiel mit der Registry
    // ---------------------------------------------------------------

    function test_RegistryAcceptsOwnerAndRejectsStranger() public {
        CitableRegistry registry = new CitableRegistry();
        registry.setNameGuard(guard);

        vm.prank(publisher);
        registry.registerRoot(keccak256("root-a"), name, "cid", 4);
        assertEq(registry.getStatement(keccak256("root-a")).author, publisher);

        vm.prank(stranger);
        vm.expectRevert(CitableRegistry.NotAuthorized.selector);
        registry.registerRoot(keccak256("root-b"), name, "cid", 4);
    }
}
