// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {VmSafe} from "forge-std/Vm.sol";
import {console} from "forge-std/console.sol";
import {CitableRegistry} from "../src/CitableRegistry.sol";
import {ENSv2NameGuard, IENSv2Registry} from "../src/ENSv2NameGuard.sol";

/// @notice Deployt Registry und Guard und verdrahtet beide.
///
///   Probelauf:  forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL
///   Ernstfall:  forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL \
///                 --private-key $PRIVATE_KEY --broadcast --verify
///
/// Der Guard entsteht nach der Registry, weil `setNameGuard` den Besitzer verlangt und
/// den setzt erst der Konstruktor der Registry. Geschrieben wird
/// `deployments/<chainid>.json` nur im Ernstfall — ein Probelauf soll die Adressen der
/// echten Deployments nicht überschreiben.
contract Deploy is Script {
    /// @dev ENSv2 ETHRegistry auf Sepolia, https://docs.ens.domains/learn/deployments/.
    ///      Bestätigt von script/js/ens-probe.mjs.
    address constant SEPOLIA_ETH_REGISTRY = 0xBDC85dD5b15D7ecb354cd7cb6f2c50b4f2c4F0E2;

    /// @dev RegistryRolesLib.ROLE_SET_RESOLVER — siehe src/ENSv2NameGuard.sol.
    uint256 constant ROLE_SET_RESOLVER = 1 << 24;

    function run() external returns (CitableRegistry registry, ENSv2NameGuard guard) {
        address ensRegistry = vm.envOr("ENS_ETH_REGISTRY", SEPOLIA_ETH_REGISTRY);
        uint256 publishRole = vm.envOr("ENS_PUBLISH_ROLE", ROLE_SET_RESOLVER);

        vm.startBroadcast();
        registry = new CitableRegistry();
        guard = new ENSv2NameGuard(IENSv2Registry(ensRegistry), publishRole);
        registry.setNameGuard(guard);
        vm.stopBroadcast();

        require(address(registry.nameGuard()) == address(guard), "guard not wired");

        console.log("chain            ", block.chainid);
        console.log("CitableRegistry  ", address(registry));
        console.log("ENSv2NameGuard   ", address(guard));
        console.log("ENS ETHRegistry  ", ensRegistry);
        console.log("publish role     ", publishRole);

        if (vm.isContext(VmSafe.ForgeContext.ScriptBroadcast)) {
            _write(address(registry), address(guard), ensRegistry, publishRole);
        }
    }

    function _write(address registry, address guard, address ensRegistry, uint256 publishRole) internal {
        string memory json = "deployment";
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeAddress(json, "CitableRegistry", registry);
        vm.serializeAddress(json, "ENSv2NameGuard", guard);
        vm.serializeAddress(json, "ensEthRegistry", ensRegistry);
        vm.serializeUint(json, "publishRole", publishRole);
        string memory out = vm.serializeUint(json, "deployedAt", block.timestamp);

        string memory path = string.concat("deployments/", vm.toString(block.chainid), ".json");
        vm.writeJson(out, path);
        console.log("written to       ", path);
    }
}
