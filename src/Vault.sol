// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

// Layout of the contract file:
// version
// imports
// interfaces, libraries, contract
// errorssss

// Inside Contract:
// Type declarations
// State variables
// Events
// Modifiers

// Layout of Functions:
// constructor
// receive function (if exists)
// fallback function (if exists)
// external
// public
// internal
// private

// view & pure functions

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Vault contract (fund custody)
// Pure custody layer — holds the actual stablecoin balances
// Handles deposits/withdrawals only, with strict access control (only callable by the Escrow contract or a controller role)
// No trade logic, no conditions, no dispute state — just accounting
contract Vault is ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                            TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/
    /**
     * @dev The SafeERC20 library is used to safely handle ERC20 operations to prevent issues with non-standard ERC20 tokens, for example, USDT.
     * @notice This means for every IERC20 token, we can now call the safeTransfer, safeTransferFrom, and safeApprove functions provided by the SafeERC20 library.
     */
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    bool private s_locked;

    /*/////////////////////////////////////////////////////////
                            EVENTS
    /////////////////////////////////////////////////////////*/
    event ERCTokenDeposited(address indexed user, uint256 indexed amount);
    event ERCTokenWithdrawn(address indexed user, uint256 indexed amount);

    /*/////////////////////////////////////////////////////////
                            CONSTRUCTOR
    /////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*////////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    ////////////////////////////////////////////////////////////////*/
    function _depositERC(uint256 amount) internal {
        emit ERCTokenDeposited(msg.sender, amount);
    }

    function _withdrawERC(uint256 amount) internal {
        emit ERCTokenWithdrawn(msg.sender, amount);
    }
}
