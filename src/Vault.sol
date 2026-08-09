// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// import { EIP712 } from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
// import { SignatureChecker } from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
// import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
// import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title Vault
 * @author Kelechi Kizito Ugwu
 * @notice This contract functions at the value custoday layer for the TradeVault project.
 * @notice This contract handles deposits and withdrawals of ERC20 tokens while holding them in case of refunds and release to the Escrow contract.
 * @dev Implemenation of a multi-sig(EIP712) + timelock setEscrow function call is for future development.
 */
contract Vault is ReentrancyGuard, Ownable {
    /*,EIP712 */
    /*//////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/
    /// @dev This error is thrown when a zero address is provided
    error Vault__NoneZeroAddress();
    /// @dev This error is thrown when a function is called by an address that is not the escrow address.
    error Vault__OnlyEscrowCanCall();
    /// @dev This error is thrown when a withdrawal is attempted with an amount greater than the available balance for the specified tradeId.
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

    /// @dev The address of the escrow contract that is allowed to call deposit and withdraw functions on this vault.
    address private s_escrow;

    /// @dev The mapping that tracks the balances of ERC20 tokens held in the vault for each tradeId. Each tradeId corresponds to a specific trade, and the associated value is the amount of ERC20 tokens held for that trade.
    mapping(uint256 tradeId => uint256 tradeIdAmount) s_balances;

    /*/////////////////////////////////////////////////////////
                            EVENTS
    /////////////////////////////////////////////////////////*/
    /// @dev Emitted when ERC20 tokens are deposited into the vault. It includes the address of the user who made the deposit and the amount of tokens deposited.
    event ERCTokenDeposited(address indexed user, uint256 indexed amount);
    /// @dev Emitted when ERC20 tokens are withdrawn from the vault. It includes the address of the user who made the withdrawal and the amount of tokens withdrawn.
    event ERCTokenWithdrawn(address indexed user, uint256 indexed amount);
    /// @dev Emitted when the escrow address is updated. It includes the new escrow address.
    event EscrowAddressUpdated(address indexed escrow);

    /*/////////////////////////////////////////////////////////
                            MODIFIERS
    /////////////////////////////////////////////////////////*/
    /**
     * @dev This modifier restricts access to functions that can only be called by the escrow contract. It checks if the caller's address matches the stored escrow address and reverts with an error if it does not.
     * @param caller The address of the caller attempting to execute the function.
     */
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
    // mitigate with a timelock/multisig on setEscrow if time allows.
    /**
     * @dev This function allows the owner of the contract to set or update the escrow address. It checks if the provided escrow address is not a zero address and updates the stored escrow address accordingly. An event is emitted to log the update.
     * @param escrow The address of the new escrow contract.
     */
    function setEscrow(address escrow) external onlyOwner {
        if (escrow == address(0)) revert Vault__NoneZeroAddress();

        s_escrow = escrow;

        emit EscrowAddressUpdated(escrow);
    }

    /**
     * @dev External implementation of _depositERC.
     * @param tradeId The unique identifier for the trade associated with the deposit.
     * @param from The address from which the ERC20 tokens will be transferred.
     * @param amount The amount of ERC20 tokens to be deposited into the vault for the specified tradeId.
     */
    function depositERC(uint256 tradeId, address from, uint256 amount) external nonReentrant onlyEscrow(msg.sender) {
        _depositERC(tradeId, from, amount);
    }

    /**
     * @dev External implementation of _withdrawERC.
     * @param tradeId The unique identifier for the trade associated with the withdrawal.
     * @param to The address to which the withdrawn ERC20 tokens will be sent.
     * @param amount The amount of ERC20 tokens to be withdrawn from the vault for the specified tradeId.
     */
    function withdrawERC(uint256 tradeId, address to, uint256 amount) external nonReentrant onlyEscrow(msg.sender) {
        _withdrawERC(tradeId, to, amount);
    }

    /*////////////////////////////////////////////////////////////////
                        INTERNAL FUNCTIONS
    ////////////////////////////////////////////////////////////////*/
    // Step 1 — Approve (done by the Buyer's wallet, not your contract)
    // The Buyer calls approve() on the stablecoin contract (e.g. USDC), authorizing your Vault to pull amount tokens. This happens outside your Solidity — it's a wallet/frontend action.
    /**
     * @dev This function handles the deposit of ERC20 tokens into the vault for a specific tradeId.
     * @param tradeId The unique identifier for the trade associated with the deposit.
     * @param from The address from which the ERC20 tokens will be transferred.
     * @param amount The amount of ERC20 tokens to be deposited into the vault for the specified tradeId.
     */
    function _depositERC(uint256 tradeId, address from, uint256 amount) internal {
        // CHECKS

        // EFFECTS
        s_balances[tradeId] += amount;

        // INTERACTIONS
        I_TOKEN.safeTransferFrom(from, address(this), amount);
        emit ERCTokenDeposited(from, amount);
    }

    /**
     * @dev This function handles the withdrawal of ERC20 tokens from the vault for a specific tradeId. It checks if the vault has sufficient balance for the specified tradeId, updates the balance, and transfers the tokens to the specified address.
     * @param tradeId The uniquie identifier for the trade associated with the withdrawal.
     * @param to The address to which the withdrawn ERC20 tokens will be sent.
     * @param amount The amount of ERC20 tokens to be withdrawn from the vault for the specified tradeId.
     */
    function _withdrawERC(uint256 tradeId, address to, uint256 amount) internal {
        // CHECKS
        if (s_balances[tradeId] < amount) {
            revert Vault__InsufficientBalance();
        }

        // EFFECTS
        s_balances[tradeId] -= amount;

        // INTERACTIONS
        I_TOKEN.safeTransfer(to, amount);
        emit ERCTokenWithdrawn(to, amount);
    }
}
