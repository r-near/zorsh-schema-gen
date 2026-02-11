use borsh::BorshSchema;
use std::collections::{HashMap, HashSet};

pub mod nearcore_types;
pub mod nightmare_contract;

#[derive(BorshSchema)]
pub struct Location {
    lat: f64,
    lng: f64,
    altitude: Option<u32>,
}

#[derive(BorshSchema)]
pub enum ItemRarity {
    Common,
    Uncommon,
    Rare,
    Epic,
    Legendary,
}

#[derive(BorshSchema)]
pub struct Stats {
    strength: u16,
    dexterity: u16,
    intelligence: u16,
    health: u32,
    mana: u32,
}

#[derive(BorshSchema)]
pub enum ItemEffect {
    Damage(u32),
    Heal {
        amount: u32,
        duration: u16,
    },
    Status {
        effect_type: String,
        power: u16,
        duration: u32,
    },
    None,
}

#[derive(BorshSchema)]
pub struct Item {
    id: String,
    name: String,
    description: String,
    rarity: ItemRarity,
    level_requirement: u8,
    effects: Vec<ItemEffect>,
    stats: Option<Stats>,
    metadata: HashMap<String, String>,
}

#[derive(BorshSchema)]
pub struct Achievement {
    id: String,
    name: String,
    description: String,
    reward_points: u32,
    completed_at: Option<u64>,
    prerequisites: Vec<String>,
}

#[derive(BorshSchema)]
pub enum CharacterClass {
    Warrior(Stats),
    Mage {
        base_stats: Stats,
        spells_known: Vec<String>,
        mana_regen: f32,
    },
    Rogue {
        base_stats: Stats,
        stealth_level: u8,
        critical_chance: f32,
    },
}

#[derive(BorshSchema)]
pub struct GuildMembership {
    guild_id: String,
    guild_name: String,
    joined_at: u64,
    rank: String,
    permissions: HashSet<String>,
}

#[derive(BorshSchema)]
pub struct Trade {
    id: String,
    from_player: String,
    to_player: String,
    items: Vec<Item>,
    gold_amount: u64,
    status: String,
    created_at: u64,
    completed_at: Option<u64>,
}

#[derive(BorshSchema)]
pub struct QuestProgress {
    quest_id: String,
    started_at: u64,
    steps_completed: Vec<u32>,
    current_step: u32,
    collected_items: HashMap<String, u32>,
}

#[derive(BorshSchema)]
pub struct PlayerCharacter {
    id: String,
    name: String,
    created_at: u64,
    last_login: u64,
    character_class: CharacterClass,
    level: u32,
    experience: u64,
    location: Location,
    inventory: Vec<Item>,
    equipped_items: HashMap<String, Item>,
    achievements: Vec<Achievement>,
    completed_quests: HashSet<String>,
    active_quests: Vec<QuestProgress>,
    guild: Option<GuildMembership>,
    current_trades: Vec<Trade>,
    friends: HashSet<String>,
    blocked_players: HashSet<String>,
    settings: HashMap<String, String>,
    // Tuple test
    last_deaths: Vec<(u64, Location, String)>, // timestamp, location, cause
    skill_levels: HashMap<String, (u16, f32)>, // skill name -> (level, progress)
}

// Export schemas as borsh binary
pub fn generate_schema() -> Vec<u8> {
    use borsh::schema::BorshSchemaContainer;
    let container = BorshSchemaContainer::for_type::<PlayerCharacter>();
    borsh::to_vec(&container).unwrap()
}

// Export schemas as JSON (near-abi compatible format)
pub fn generate_schema_json() -> String {
    borsh_schema_export::to_json::<PlayerCharacter>()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_generate_schema() -> std::io::Result<()> {
        let data = generate_schema();
        fs::write("../../test/fixtures/complex_schema.bin", data)?;
        Ok(())
    }

    #[test]
    fn test_generate_schema_json() -> std::io::Result<()> {
        let json = generate_schema_json();
        fs::write("../../test/fixtures/complex_schema.json", &json)?;
        Ok(())
    }

    #[test]
    fn test_generate_nightmare_schema_json() -> std::io::Result<()> {
        let json = borsh_schema_export::to_json::<nightmare_contract::ContractState>();
        fs::write("../../test/fixtures/nightmare_contract.json", &json)?;

        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["declaration"], "ContractState");

        let def_count = parsed["definitions"].as_object().unwrap().len();
        println!("nightmare contract schema has {} definitions", def_count);
        assert!(
            def_count > 40,
            "Expected 40+ definitions, got {}",
            def_count
        );

        Ok(())
    }

    #[test]
    fn test_generate_nearcore_schema_json() -> std::io::Result<()> {
        let json = borsh_schema_export::to_json::<nearcore_types::BlockHeader>();
        fs::write("../../test/fixtures/nearcore_block_header.json", &json)?;

        // Sanity check: the JSON should parse and have the right root
        let parsed: serde_json::Value = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed["declaration"], "BlockHeader");
        assert!(parsed["definitions"]["BlockHeader"].is_object());
        assert!(parsed["definitions"]["BlockHeaderV1"].is_object());
        assert!(parsed["definitions"]["BlockHeaderV6"].is_object());

        // Count definitions — should be substantial (30+ types)
        let def_count = parsed["definitions"].as_object().unwrap().len();
        println!("nearcore BlockHeader schema has {} definitions", def_count);
        assert!(
            def_count > 30,
            "Expected 30+ definitions, got {}",
            def_count
        );

        Ok(())
    }
}
