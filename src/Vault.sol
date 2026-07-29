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
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Vault contract (fund custody)
// Pure custody layer — holds the actual stablecoin balances
// Handles deposits/withdrawals only, with strict access control (only callable by the Escrow contract or a controller role)
// No trade logic, no conditions, no dispute state — just accounting
contract Vault is ReentrancyGuard, Ownable {
    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/
    error Vault__NoneZeroAddress();
    error Vault__OnlyEscrowCanCall();
    error Vault__InsufficientBalance();

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
    /// @dev The interface to the stablecoin used for payments. In this case, and erc20 token.
    IERC20 private immutable I_TOKEN;

    address private s_escrow;

    bool private s_locked;

    mapping(uint256 tradeId => uint256 tradeIdAmount) s_balances;

    /*/////////////////////////////////////////////////////////
                            EVENTS
    /////////////////////////////////////////////////////////*/
    event ERCTokenDeposited(address indexed user, uint256 indexed amount);
    event ERCTokenWithdrawn(address indexed user, uint256 indexed amount);
    event EscrowAddressUpdated(address indexed escrow);

    /*/////////////////////////////////////////////////////////
                            MODIFIERS
    /////////////////////////////////////////////////////////*/
    modifier onlyEscrow(address caller) {
        if (caller != s_escrow) {
            revert Vault__OnlyEscrowCanCall();
        }
        _;
    }

    /*/////////////////////////////////////////////////////////
                            CONSTRUCTOR
    /////////////////////////////////////////////////////////*/
    constructor(address token, address escrow) Ownable(msg.sender) {
        if (token == address(0)) revert Vault__NoneZeroAddress();
        if (escrow == address(0)) revert Vault__NoneZeroAddress();

        I_TOKEN = IERC20(token);
        s_escrow = escrow;
    }

    /*//////////////////////////////////////////////////////////////
                        EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    function setEscrow(address escrow) external onlyOwner {
        if (escrow == address(0)) revert Vault__NoneZeroAddress();

        s_escrow = escrow;

        emit EscrowAddressUpdated(escrow);
    }

    function depositERC(uint256 tradeId, address from, uint256 amount) external nonReentrant onlyEscrow(msg.sender) {
        _depositERC(tradeId, from, amount);
    }

    function withdrawERC(uint256 tradeId, address to, uint256 amount) external nonReentrant onlyEscrow(msg.sender) {
        _withdrawERC(tradeId, to, amount);
    }

    /*////////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    ////////////////////////////////////////////////////////////////*/
    // Step 1 — Approve (done by the Buyer's wallet, not your contract)
    // The Buyer calls approve() on the stablecoin contract (e.g. USDC), authorizing your Vault to pull amount tokens. This happens outside your Solidity — it's a wallet/frontend action.
    function _depositERC(uint256 tradeId, address from, uint256 amount) internal {
        // CHECKS

        // EFFECTS
        s_balances[tradeId] += amount;

        // INTERACTIONS
        I_TOKEN.safeTransferFrom(from, address(this), amount);
        emit ERCTokenDeposited(msg.sender, amount);
    }

    function _withdrawERC(uint256 tradeId, address to, uint256 amount) internal {
        // CHECKS
        if (s_balances[tradeId] < amount) {
            revert Vault__InsufficientBalance();
        }

        // EFFECTS
        s_balances[tradeId] -= amount;

        // INTERACTIONS
        I_TOKEN.safeTransfer(to, amount);
        emit ERCTokenWithdrawn(msg.sender, amount);
    }
}
