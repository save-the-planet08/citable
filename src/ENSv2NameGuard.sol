// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {INameGuard} from "./INameGuard.sol";

/// @notice Der Ausschnitt der ENSv2-`PermissionedRegistry`, den der Guard braucht.
/// @dev Beide Funktionen nehmen eine beliebige Kennung (Labelhash, Token-ID oder
///      Resource) und lösen die Versionsbits selbst auf. Genau deshalb rechnet der Guard
///      keine Token-ID aus: Die unteren 32 Bit tragen `tokenVersionId` bzw.
///      `eacVersionId` aus dem Registry-Speicher und ändern sich ohne Vorwarnung —
///      Nachweis in `script/js/ens-probe.mjs`.
interface IENSv2Registry {
    /// @return Der Token-Inhaber, oder `address(0)` wenn frei, reserviert oder abgelaufen.
    function getOwner(uint256 anyId) external view returns (address);

    /// @return Die Rollen von `account` für genau diesen Namen.
    function roles(uint256 anyId, address account) external view returns (uint256);
}

/// @title ENSv2NameGuard
/// @notice Prüft gegen ENSv2, ob ein Konto unter einem Namen veröffentlichen darf.
/// @dev Nicht bloß Besitz: Wer die Publikationsrolle zugewiesen bekommen hat, darf
///      ebenfalls. Das bildet eine Redaktion ab — ein Volontär veröffentlicht unter dem
///      Namen der Zeitung, ohne ihn zu besitzen.
///
///      `ensNode` ist die ENSv2-Kennung des Namens in `REGISTRY`, also `labelhash(label)`
///      — nicht der ENSv1-Namehash. Aus einem Namehash ließe sich das Label nicht
///      zurückgewinnen, und ohne Label findet die Registry ihren Eintrag nicht. v1 deckt
///      damit die Namen genau einer Registry ab; Unternamen bräuchten einen Abstieg über
///      `getSubregistry` und sind vertagt.
contract ENSv2NameGuard is INameGuard {
    /// @notice Die Registry, deren Namen dieser Guard kennt (auf Sepolia: die ETHRegistry).
    IENSv2Registry public immutable REGISTRY;

    /// @notice Die Rolle, die zum Veröffentlichen berechtigt.
    /// @dev Kein neues Rollen-Bit erfindbar: ENSv2 vergibt Admin-Rollen nur bei der
    ///      Registrierung, ein Inhaber kann also nur weitergeben, wofür er das Admin-Bit
    ///      hält. Auf Sepolia ist das `ROLE_SET_RESOLVER` (1 << 24) — wer den Resolver
    ///      eines Namens umstellen darf, verantwortet, was unter dem Namen steht. Als
    ///      Konstruktorwert und nicht als Konstante, damit eine andere Registry mit
    ///      anderer Rollenvergabe denselben Guard nutzen kann.
    uint256 public immutable PUBLISH_ROLE;

    error ZeroRegistry();
    error ZeroRole();

    constructor(IENSv2Registry registry, uint256 publishRole) {
        if (address(registry) == address(0)) revert ZeroRegistry();
        if (publishRole == 0) revert ZeroRole();
        REGISTRY = registry;
        PUBLISH_ROLE = publishRole;
    }

    /// @inheritdoc INameGuard
    function mayPublish(bytes32 ensNode, address account) external view returns (bool) {
        if (account == address(0)) return false;

        uint256 anyId = uint256(ensNode);
        address holder = REGISTRY.getOwner(anyId);

        // Kein Inhaber heißt: frei, reserviert oder abgelaufen. "ens" auf Sepolia ist
        // genau dieser Fall — Resolver und Ablauf gesetzt, nie ein Token geprägt.
        if (holder == address(0)) return false;
        if (holder == account) return true;

        // `roles` und nicht `hasRoles`: `hasRoles` rechnet die Rollen der ROOT_RESOURCE
        // hinzu. Wer sie dort hält — der Registrar der Registry —, dürfte sonst unter
        // jedem fremden Namen veröffentlichen. Diese Hintertür bleibt zu.
        return REGISTRY.roles(anyId, account) & PUBLISH_ROLE == PUBLISH_ROLE;
    }
}
