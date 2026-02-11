// A "nightmare" NEAR smart contract with deeply nested types.
// Models a complex DeFi/NFT/DAO hybrid contract.

use borsh::{BorshSchema, BorshSerialize};
use std::collections::{HashMap, HashSet};

// --- Deeply nested value types ---

#[derive(BorshSchema)]
pub struct TokenAmount {
    pub amount: u128,
    pub decimals: u8,
}

#[derive(BorshSchema)]
pub enum AssetId {
    Native,
    FungibleToken(String), // account_id
    NonFungibleToken {
        contract_id: String,
        token_id: String,
    },
    MultiToken {
        contract_id: String,
        token_id: String,
        amount: TokenAmount,
    },
}

#[derive(BorshSchema, BorshSerialize)]
pub struct PriceOracle {
    pub source: String,
    pub price: u128,
    pub decimals: u8,
    pub timestamp: u64,
    pub confidence: Option<f64>,
}

#[derive(BorshSchema)]
pub struct LiquidityPool {
    pub pool_id: u64,
    pub token_a: AssetId,
    pub token_b: AssetId,
    pub reserve_a: TokenAmount,
    pub reserve_b: TokenAmount,
    pub total_shares: u128,
    pub fee_rate: u32,
    pub oracle: Option<PriceOracle>,
    // Nested collection: user shares per pool
    pub user_shares: HashMap<String, u128>,
}

// --- Governance / DAO types ---

#[derive(BorshSchema)]
pub enum VoteWeight {
    Equal,
    TokenWeighted(u128),
    QuadraticTokenWeighted(u128),
    DelegatedFrom(Vec<(String, u128)>), // Vec of tuples
}

#[derive(BorshSchema)]
pub enum ProposalAction {
    Transfer {
        recipient: String,
        asset: AssetId,
        amount: TokenAmount,
        memo: Option<String>,
    },
    AddLiquidity {
        pool: LiquidityPool,
        amounts: (TokenAmount, TokenAmount), // tuple of structs
    },
    RemoveLiquidity {
        pool_id: u64,
        shares: u128,
        min_amounts: (TokenAmount, TokenAmount),
    },
    UpdateConfig(HashMap<String, String>),
    UpgradeContract {
        code_hash: [u8; 32],
        migration_args: Option<Vec<u8>>,
    },
    BatchActions(Vec<ProposalAction>), // recursive! Vec of self
    ConditionalAction {
        condition: ProposalCondition,
        if_true: Box<ProposalAction>,
        if_false: Option<Box<ProposalAction>>,
    },
}

#[derive(BorshSchema, BorshSerialize)]
pub enum ProposalCondition {
    TimePassed(u64),
    QuorumReached {
        threshold: u128,
    },
    OraclePrice {
        oracle: PriceOracle,
        above: Option<u128>,
        below: Option<u128>,
    },
    And(Vec<ProposalCondition>), // recursive
    Or(Vec<ProposalCondition>),  // recursive
    Not(Box<ProposalCondition>), // recursive
}

#[derive(BorshSchema)]
pub struct Vote {
    pub voter: String,
    pub weight: VoteWeight,
    pub approve: bool,
    pub timestamp: u64,
    pub memo: Option<String>,
}

#[derive(BorshSchema)]
pub enum ProposalStatus {
    Draft,
    Active {
        start_time: u64,
        end_time: u64,
    },
    Approved {
        approved_at: u64,
        execution_deadline: u64,
    },
    Rejected {
        rejected_at: u64,
        reason: Option<String>,
    },
    Executed {
        executed_at: u64,
        result: Vec<u8>,
    },
    Expired,
}

#[derive(BorshSchema)]
pub struct Proposal {
    pub id: u64,
    pub proposer: String,
    pub title: String,
    pub description: String,
    pub actions: Vec<ProposalAction>,
    pub status: ProposalStatus,
    pub votes: Vec<Vote>,
    pub vote_counts: HashMap<bool, u128>, // approve/reject -> total weight
    pub created_at: u64,
    pub metadata: HashMap<String, String>,
}

// --- NFT types with deep nesting ---

#[derive(BorshSchema)]
pub struct Attribute {
    pub trait_type: String,
    pub value: String,
    pub display_type: Option<String>,
    pub max_value: Option<u64>,
}

#[derive(BorshSchema)]
pub struct TokenMetadata {
    pub title: Option<String>,
    pub description: Option<String>,
    pub media: Option<String>,
    pub media_hash: Option<[u8; 32]>,
    pub copies: Option<u64>,
    pub issued_at: Option<u64>,
    pub expires_at: Option<u64>,
    pub starts_at: Option<u64>,
    pub updated_at: Option<u64>,
    pub extra: Option<String>,
    pub reference: Option<String>,
    pub reference_hash: Option<[u8; 32]>,
    pub attributes: Vec<Attribute>,
}

#[derive(BorshSchema)]
pub struct Royalty {
    pub accounts: HashMap<String, u32>, // account -> basis points
    pub max_payout: Option<u128>,
}

#[derive(BorshSchema)]
pub struct NftToken {
    pub token_id: String,
    pub owner_id: String,
    pub metadata: TokenMetadata,
    pub royalty: Option<Royalty>,
    pub approved_account_ids: HashMap<String, u64>,
    pub split_owners: Option<HashMap<String, u32>>,
    // Deep nesting: history of transfers
    pub transfer_history: Vec<(u64, String, String, Option<String>)>, // (timestamp, from, to, memo)
    // Nested collection: offers per token
    pub offers: Vec<TokenOffer>,
}

#[derive(BorshSchema)]
pub struct TokenOffer {
    pub offerer: String,
    pub amount: TokenAmount,
    pub asset: AssetId,
    pub expires_at: Option<u64>,
    pub conditions: Vec<ProposalCondition>, // reusing governance conditions!
}

// --- The "insane" top-level contract state ---

#[derive(BorshSchema)]
pub struct ContractState {
    // Basic
    pub owner_id: String,
    pub version: (u8, u8, u8), // semver tuple

    // DeFi
    pub pools: Vec<LiquidityPool>,
    pub pool_index: HashMap<(String, String), u64>, // (token_a, token_b) -> pool_id
    pub user_positions: HashMap<String, Vec<(u64, u128)>>, // user -> [(pool_id, shares)]

    // Governance
    pub proposals: Vec<Proposal>,
    pub active_proposal_ids: HashSet<u64>,
    pub council_members: HashSet<String>,
    pub delegation_map: HashMap<String, Vec<(String, u128)>>, // delegator -> [(delegate, amount)]

    // NFT
    pub tokens: HashMap<String, NftToken>,
    pub tokens_per_owner: HashMap<String, HashSet<String>>, // owner -> token_ids
    pub collection_metadata: TokenMetadata,

    // Complex nested: staking tiers with nested rewards
    pub staking_tiers: Vec<StakingTier>,

    // Global config
    pub config: HashMap<String, Vec<u8>>, // arbitrary borsh-encoded config values
    pub paused_features: HashSet<String>,

    // Audit log (deeply nested tuples)
    pub audit_log: Vec<(u64, String, AuditAction, Option<HashMap<String, String>>)>,
}

#[derive(BorshSchema)]
pub struct StakingTier {
    pub name: String,
    pub min_stake: u128,
    pub max_stake: Option<u128>,
    pub apy_basis_points: u32,
    pub lockup_period: u64,
    pub rewards: Vec<StakingReward>,
    pub eligible_pools: Option<Vec<u64>>,
    pub bonus_conditions: Vec<ProposalCondition>, // reuse conditions
}

#[derive(BorshSchema)]
pub struct StakingReward {
    pub asset: AssetId,
    pub amount_per_day: TokenAmount,
    pub vesting_schedule: Option<Vec<(u64, u32)>>, // [(timestamp, percentage)]
    pub multiplier_by_tier: HashMap<String, f64>,
}

#[derive(BorshSchema)]
pub enum AuditAction {
    Transfer {
        from: String,
        to: String,
        asset: AssetId,
        amount: TokenAmount,
    },
    Swap {
        pool_id: u64,
        amount_in: TokenAmount,
        amount_out: TokenAmount,
    },
    Stake {
        amount: u128,
        tier: String,
    },
    Unstake {
        amount: u128,
        tier: String,
    },
    ProposalCreated(u64),
    ProposalVoted {
        proposal_id: u64,
        vote: Vote,
    },
    ConfigChanged {
        key: String,
        old_value: Option<Vec<u8>>,
        new_value: Vec<u8>,
    },
    NftMinted {
        token_id: String,
        owner: String,
    },
    NftTransferred {
        token_id: String,
        from: String,
        to: String,
    },
    BatchAction(Vec<AuditAction>), // recursive
}

#[cfg(test)]
mod tests {
    use super::*;
    use borsh::to_vec;
    use std::fs;

    #[test]
    fn test_serialize_recursive_proposal_condition() -> std::io::Result<()> {
        // And([TimePassed(100), Or([TimePassed(200), Not(TimePassed(300))])])
        let value = ProposalCondition::And(vec![
            ProposalCondition::TimePassed(100),
            ProposalCondition::Or(vec![
                ProposalCondition::TimePassed(200),
                ProposalCondition::Not(Box::new(ProposalCondition::TimePassed(300))),
            ]),
        ]);
        let bytes = to_vec(&value).unwrap();
        fs::write("../../test/fixtures/proposal_condition.bin", &bytes)?;
        println!("Serialized {} bytes: {:?}", bytes.len(), bytes);
        Ok(())
    }
}
