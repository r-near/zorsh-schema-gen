// Faithful mirror of nearcore's BlockHeader type hierarchy.
// Models the exact Borsh wire format without nearcore dependencies.

use borsh::BorshSchema;

// --- Primitive type wrappers (matching nearcore's wire format) ---

/// CryptoHash is a 32-byte SHA-256 hash (newtype around [u8; 32])
#[derive(BorshSchema)]
pub struct CryptoHash(pub [u8; 32]);

/// MerkleHash is just a CryptoHash alias — but for BorshSchema we mirror
/// nearcore's `type MerkleHash = CryptoHash`, so it uses the same schema.
pub type MerkleHash = CryptoHash;

/// EpochId wraps a CryptoHash
#[derive(BorshSchema)]
pub struct EpochId(pub CryptoHash);

/// ShardId wraps a u64
#[derive(BorshSchema)]
pub struct ShardId(pub u64);

/// NearToken (Balance) — repr(transparent) around u128
#[derive(BorshSchema)]
#[repr(transparent)]
pub struct NearToken {
    pub inner: u128,
}

pub type Balance = NearToken;
pub type BlockHeight = u64;
pub type NumBlocks = u64;
pub type ProtocolVersion = u32;

// AccountId is borsh-serialized as a String (u32 len + UTF-8 bytes)
pub type AccountId = String;

// --- Crypto types ---

/// ED25519 public key (32 bytes)
#[derive(BorshSchema)]
pub struct ED25519PublicKey(pub [u8; 32]);

/// SECP256K1 public key (64 bytes)
#[derive(BorshSchema)]
pub struct Secp256K1PublicKey(pub [u8; 64]);

/// Public key enum (u8 discriminant)
#[derive(BorshSchema)]
pub enum PublicKey {
    ED25519(ED25519PublicKey),
    SECP256K1(Secp256K1PublicKey),
}

/// ED25519 signature (64 bytes)
#[derive(BorshSchema)]
pub struct ED25519Signature(pub [u8; 64]);

/// SECP256K1 signature (65 bytes)
#[derive(BorshSchema)]
pub struct Secp256K1Signature(pub [u8; 65]);

/// Signature enum (u8 discriminant)
#[derive(BorshSchema)]
pub enum Signature {
    ED25519(ED25519Signature),
    SECP256K1(Secp256K1Signature),
}

// --- Validator types ---

/// ValidatorStakeV1 fields
#[derive(BorshSchema)]
pub struct ValidatorStakeV1 {
    pub account_id: AccountId,
    pub public_key: PublicKey,
    pub stake: Balance,
}

#[derive(BorshSchema)]
pub enum ValidatorStake {
    V1(ValidatorStakeV1),
}

#[derive(BorshSchema)]
pub struct SlashedValidator {
    pub account_id: AccountId,
    pub is_double_sign: bool,
}

// --- Chunk endorsements ---

#[derive(BorshSchema)]
pub struct ChunkEndorsementsBitmap {
    pub inner: Vec<Vec<u8>>,
}

// --- Block header inner parts ---

#[derive(BorshSchema)]
pub struct BlockHeaderInnerLite {
    pub height: BlockHeight,
    pub epoch_id: EpochId,
    pub next_epoch_id: EpochId,
    pub prev_state_root: MerkleHash,
    pub prev_outcome_root: MerkleHash,
    pub timestamp: u64,
    pub next_bp_hash: CryptoHash,
    pub block_merkle_root: CryptoHash,
}

// V1: Original inner rest (14 fields)
#[derive(BorshSchema)]
pub struct BlockHeaderInnerRest {
    pub prev_chunk_outgoing_receipts_root: MerkleHash,
    pub chunk_headers_root: MerkleHash,
    pub chunk_tx_root: MerkleHash,
    pub chunks_included: u64,
    pub challenges_root: MerkleHash,
    pub random_value: CryptoHash,
    pub prev_validator_proposals: Vec<ValidatorStakeV1>,
    pub chunk_mask: Vec<bool>,
    pub next_gas_price: Balance,
    pub total_supply: Balance,
    pub challenges_result: Vec<SlashedValidator>,
    pub last_final_block: CryptoHash,
    pub last_ds_final_block: CryptoHash,
    pub approvals: Vec<Option<Box<Signature>>>,
    pub latest_protocol_version: ProtocolVersion,
}

// V2: Remove chunks_included (13 fields)
#[derive(BorshSchema)]
pub struct BlockHeaderInnerRestV2 {
    pub prev_chunk_outgoing_receipts_root: MerkleHash,
    pub chunk_headers_root: MerkleHash,
    pub chunk_tx_root: MerkleHash,
    pub challenges_root: MerkleHash,
    pub random_value: CryptoHash,
    pub prev_validator_proposals: Vec<ValidatorStakeV1>,
    pub chunk_mask: Vec<bool>,
    pub next_gas_price: Balance,
    pub total_supply: Balance,
    pub challenges_result: Vec<SlashedValidator>,
    pub last_final_block: CryptoHash,
    pub last_ds_final_block: CryptoHash,
    pub approvals: Vec<Option<Box<Signature>>>,
    pub latest_protocol_version: ProtocolVersion,
}

// V3: Use ValidatorStake enum, add prev_height/block_ordinal/epoch_sync_data_hash (16 fields)
#[derive(BorshSchema)]
pub struct BlockHeaderInnerRestV3 {
    pub prev_chunk_outgoing_receipts_root: MerkleHash,
    pub chunk_headers_root: MerkleHash,
    pub chunk_tx_root: MerkleHash,
    pub challenges_root: MerkleHash,
    pub random_value: CryptoHash,
    pub prev_validator_proposals: Vec<ValidatorStake>,
    pub chunk_mask: Vec<bool>,
    pub next_gas_price: Balance,
    pub total_supply: Balance,
    pub challenges_result: Vec<SlashedValidator>,
    pub last_final_block: CryptoHash,
    pub last_ds_final_block: CryptoHash,
    pub block_ordinal: NumBlocks,
    pub prev_height: BlockHeight,
    pub epoch_sync_data_hash: Option<CryptoHash>,
    pub approvals: Vec<Option<Box<Signature>>>,
    pub latest_protocol_version: ProtocolVersion,
}

// V4: Add block_body_hash (17 fields)
#[derive(BorshSchema)]
pub struct BlockHeaderInnerRestV4 {
    pub block_body_hash: CryptoHash,
    pub prev_chunk_outgoing_receipts_root: MerkleHash,
    pub chunk_headers_root: MerkleHash,
    pub chunk_tx_root: MerkleHash,
    pub challenges_root: MerkleHash,
    pub random_value: CryptoHash,
    pub prev_validator_proposals: Vec<ValidatorStake>,
    pub chunk_mask: Vec<bool>,
    pub next_gas_price: Balance,
    pub total_supply: Balance,
    pub challenges_result: Vec<SlashedValidator>,
    pub last_final_block: CryptoHash,
    pub last_ds_final_block: CryptoHash,
    pub block_ordinal: NumBlocks,
    pub prev_height: BlockHeight,
    pub epoch_sync_data_hash: Option<CryptoHash>,
    pub approvals: Vec<Option<Box<Signature>>>,
    pub latest_protocol_version: ProtocolVersion,
}

// V5: Add chunk_endorsements (18 fields)
#[derive(BorshSchema)]
pub struct BlockHeaderInnerRestV5 {
    pub block_body_hash: CryptoHash,
    pub prev_chunk_outgoing_receipts_root: MerkleHash,
    pub chunk_headers_root: MerkleHash,
    pub chunk_tx_root: MerkleHash,
    pub challenges_root: MerkleHash,
    pub random_value: CryptoHash,
    pub prev_validator_proposals: Vec<ValidatorStake>,
    pub chunk_mask: Vec<bool>,
    pub next_gas_price: Balance,
    pub total_supply: Balance,
    pub challenges_result: Vec<SlashedValidator>,
    pub last_final_block: CryptoHash,
    pub last_ds_final_block: CryptoHash,
    pub block_ordinal: NumBlocks,
    pub prev_height: BlockHeight,
    pub epoch_sync_data_hash: Option<CryptoHash>,
    pub approvals: Vec<Option<Box<Signature>>>,
    pub latest_protocol_version: ProtocolVersion,
    pub chunk_endorsements: ChunkEndorsementsBitmap,
}

// V6: Remove challenges_root/challenges_result, add shard_split (17 fields)
#[derive(BorshSchema)]
pub struct BlockHeaderInnerRestV6 {
    pub block_body_hash: CryptoHash,
    pub prev_chunk_outgoing_receipts_root: MerkleHash,
    pub chunk_headers_root: MerkleHash,
    pub chunk_tx_root: MerkleHash,
    pub random_value: CryptoHash,
    pub prev_validator_proposals: Vec<ValidatorStake>,
    pub chunk_mask: Vec<bool>,
    pub next_gas_price: Balance,
    pub total_supply: Balance,
    pub last_final_block: CryptoHash,
    pub last_ds_final_block: CryptoHash,
    pub block_ordinal: NumBlocks,
    pub prev_height: BlockHeight,
    pub epoch_sync_data_hash: Option<CryptoHash>,
    pub approvals: Vec<Option<Box<Signature>>>,
    pub latest_protocol_version: ProtocolVersion,
    pub chunk_endorsements: ChunkEndorsementsBitmap,
    pub shard_split: Option<(ShardId, AccountId)>,
}

// --- BlockHeader versions ---

#[derive(BorshSchema)]
pub struct BlockHeaderV1 {
    pub prev_hash: CryptoHash,
    pub inner_lite: BlockHeaderInnerLite,
    pub inner_rest: BlockHeaderInnerRest,
    pub signature: Signature,
    // hash is #[borsh(skip)] in nearcore, so it won't appear in schema
}

#[derive(BorshSchema)]
pub struct BlockHeaderV2 {
    pub prev_hash: CryptoHash,
    pub inner_lite: BlockHeaderInnerLite,
    pub inner_rest: BlockHeaderInnerRestV2,
    pub signature: Signature,
}

#[derive(BorshSchema)]
pub struct BlockHeaderV3 {
    pub prev_hash: CryptoHash,
    pub inner_lite: BlockHeaderInnerLite,
    pub inner_rest: BlockHeaderInnerRestV3,
    pub signature: Signature,
}

#[derive(BorshSchema)]
pub struct BlockHeaderV4 {
    pub prev_hash: CryptoHash,
    pub inner_lite: BlockHeaderInnerLite,
    pub inner_rest: BlockHeaderInnerRestV4,
    pub signature: Signature,
}

#[derive(BorshSchema)]
pub struct BlockHeaderV5 {
    pub prev_hash: CryptoHash,
    pub inner_lite: BlockHeaderInnerLite,
    pub inner_rest: BlockHeaderInnerRestV5,
    pub signature: Signature,
}

#[derive(BorshSchema)]
pub struct BlockHeaderV6 {
    pub prev_hash: CryptoHash,
    pub inner_lite: BlockHeaderInnerLite,
    pub inner_rest: BlockHeaderInnerRestV6,
    pub signature: Signature,
}

/// Versioned BlockHeader — 6-variant enum
#[derive(BorshSchema)]
pub enum BlockHeader {
    BlockHeaderV1(BlockHeaderV1),
    BlockHeaderV2(BlockHeaderV2),
    BlockHeaderV3(BlockHeaderV3),
    BlockHeaderV4(BlockHeaderV4),
    BlockHeaderV5(BlockHeaderV5),
    BlockHeaderV6(BlockHeaderV6),
}
