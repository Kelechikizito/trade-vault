-include .env

.PHONY: all test clean install update build coverage snapshot format anvil \
        deploy-usdc-vault-arc-testnet deploy-escrow-arc-testnet \
        set-actual-escrow-script-arc-testnet deploy-all-arc-testnet help

DEFAULT_ANVIL_KEY := 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

help:
	@echo "Usage:"
	@echo "  make deploy-usdc-vault-arc-testnet"
	@echo "  make deploy-escrow-arc-testnet"
	@echo "  make set-actual-escrow-script-arc-testnet"
	@echo "  make deploy-all-arc-testnet   (runs the three deploy steps above, in order)"
	@echo ""
	@echo "  NETWORK_ARGS is set via ARGS, e.g.:"
	@echo "    make some-target ARGS=\"--network arc-testnet\""
	@echo "    (omit ARGS to default to a local anvil node)"

all: clean remove install update build

# Clean the repo
clean :; forge clean

# Remove modules
remove :; rm -rf .gitmodules && rm -rf .git/modules/* && rm -rf lib && touch .gitmodules && git add . && git commit -m "modules"

# TradeVault dependencies only — forge-std for scripting/testing,
# openzeppelin-contracts v5.x (required: Escrow/Vault use the OZ v5
# Ownable(msg.sender) constructor signature, incompatible with v4.x),
# foundry-devops for get_most_recent_deployment in deployment scripts.
install :; forge install foundry-rs/forge-std@v1.9.4 --no-commit && forge install openzeppelin/openzeppelin-contracts@v5.1.0 --no-commit && forge install cyfrin/foundry-devops@0.2.3 --no-commit

# Update Dependencies
update :; forge update

build :; forge build

test :; forge test

coverage :; forge coverage --report debug > coverage-report.txt

snapshot :; forge snapshot

format :; forge fmt

anvil :; anvil -m 'test test test test test test test test test test test junk' --steps-tracing --block-time 1

NETWORK_ARGS := --rpc-url http://localhost:8545 --private-key $(DEFAULT_ANVIL_KEY) --broadcast

ifeq ($(findstring --network arc-testnet,$(ARGS)),--network arc-testnet)
	NETWORK_ARGS := --rpc-url $(ALCHEMY_ARC_TESTNET_RPC_URL) --account sepolia-acc --broadcast --verify --verifier blockscout --verifier-url https://testnet.arcscan.app/api/ -vvvv
endif

# ---- Arc Testnet deployment ----
# Order matters: Vault first (needs a placeholder escrow address),
# then Escrow (looks up the just-deployed Vault via DevOpsTools),
# then wire them together with SetEscrowScript.

deploy-usdc-vault-arc-testnet:
	forge script script/deployment/DeployVaultScript.s.sol:DeployVaultScript --sig "run(address,address)" 0x3600000000000000000000000000000000000000 $(DEPLOYER_ADDRESS) --rpc-url $(ALCHEMY_ARC_TESTNET_RPC_URL) --account sepolia-acc --broadcast --verify --verifier blockscout --verifier-url https://testnet.arcscan.app/api/ -vvvv

deploy-escrow-arc-testnet:
	forge script script/deployment/DeployEscrowScript.s.sol:DeployEscrowScript --rpc-url $(ALCHEMY_ARC_TESTNET_RPC_URL) --account sepolia-acc --broadcast --verify --verifier blockscout --verifier-url https://testnet.arcscan.app/api/ -vvvv

set-actual-escrow-script-arc-testnet:
	forge script script/interactions/SetEscrowScript.s.sol:SetEscrowScript --rpc-url $(ALCHEMY_ARC_TESTNET_RPC_URL) --account sepolia-acc --broadcast -vvvv

# Convenience target: runs all three in the required order.
deploy-all-arc-testnet: deploy-usdc-vault-arc-testnet deploy-escrow-arc-testnet set-actual-escrow-script-arc-testnet

# deploy-usdc-vault-arc-testnet:
# 	forge script script/deployment/DeployVaultScript.s.sol:DeployVaultScript --sig "run(address,address)" 0x3600000000000000000000000000000000000000 $(DEPLOYER_ADDRESS) --rpc-url $(ALCHEMY_ARC_TESTNET_RPC_URL) --account sepolia-acc --broadcast --verify --verifier blockscout --verifier-url https://testnet.arcscan.app/api/ -vvvv

# deploy-escrow-arc-testnet:
# 	forge script script/deployment/DeployEscrowScript.s.sol:DeployEscrowScript --rpc-url $(ALCHEMY_ARC_TESTNET_RPC_URL) --account sepolia-acc --broadcast --verify --verifier blockscout --verifier-url https://testnet.arcscan.app/api/ -vvvv

# set-actual-escrow-script-arc-testnet:
# 	forge script script/interactions/SetEscrowScript.s.sol:SetEscrowScript --rpc-url $(ALCHEMY_ARC_TESTNET_RPC_URL) --account sepolia-acc --broadcast --verify --verifier blockscout --verifier-url https://testnet.arcscan.app/api/ -vvvv


