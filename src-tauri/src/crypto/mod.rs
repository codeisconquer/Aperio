use std::sync::OnceLock;

use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD, Engine};
use keyring::Entry;

const KEYRING_SERVICE: &str = "com.aperio.app";
const KEYRING_USER: &str = "master-encryption-key";

static MASTER_KEY: OnceLock<[u8; 32]> = OnceLock::new();

fn keyring_entry() -> Result<Entry, String> {
    Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| format!("Keyring error: {e}"))
}

fn load_or_create_master_key() -> Result<[u8; 32], String> {
    let entry = keyring_entry()?;

    match entry.get_password() {
        Ok(stored) => decode_master_key(&stored),
        Err(keyring::Error::NoEntry) => {
            let key = Aes256Gcm::generate_key(&mut OsRng);
            let encoded = hex::encode(key.as_slice());
            entry
                .set_password(&encoded)
                .map_err(|e| format!("Failed to store master key in OS keychain: {e}"))?;
            decode_master_key(&encoded)
        }
        Err(err) => Err(format!("Failed to read master key from OS keychain: {err}")),
    }
}

fn decode_master_key(encoded: &str) -> Result<[u8; 32], String> {
    let bytes = hex::decode(encoded.trim())
        .map_err(|e| format!("Invalid master key format in keychain: {e}"))?;
    bytes
        .try_into()
        .map_err(|_| "Master key must be 32 bytes".to_string())
}

/// Ensures a master AES-256 key exists in the OS keychain (generated on first launch).
pub fn ensure_master_key() -> Result<(), String> {
    let key = load_or_create_master_key()?;
    let _ = MASTER_KEY.set(key);
    Ok(())
}

fn master_key() -> Result<&'static [u8; 32], String> {
    if let Some(key) = MASTER_KEY.get() {
        return Ok(key);
    }
    let key = load_or_create_master_key()?;
    let _ = MASTER_KEY.set(key);
    MASTER_KEY
        .get()
        .ok_or_else(|| "Master key initialization failed".to_string())
}

pub fn encrypt(plaintext: &str) -> Result<String, String> {
    let key = master_key()?;
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|e| format!("Cipher init failed: {e}"))?;
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {e}"))?;

    let mut payload = nonce.to_vec();
    payload.extend(ciphertext);
    Ok(STANDARD.encode(payload))
}

pub fn decrypt(encoded: &str) -> Result<String, String> {
    let key = master_key()?;
    let payload = STANDARD
        .decode(encoded.trim())
        .map_err(|e| format!("Invalid encrypted payload: {e}"))?;

    if payload.len() < 12 {
        return Err("Encrypted payload is too short".into());
    }

    let (nonce_bytes, ciphertext) = payload.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);
    let cipher =
        Aes256Gcm::new_from_slice(key).map_err(|e| format!("Cipher init failed: {e}"))?;
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {e}"))?;

    String::from_utf8(plaintext).map_err(|e| format!("Decrypted token is not valid UTF-8: {e}"))
}
