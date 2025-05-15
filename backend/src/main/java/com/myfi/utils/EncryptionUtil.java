package com.myfi.utils;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.KeySpec;
import java.util.Base64;

public class EncryptionUtil {

    private static final String ENCRYPTION_ALGORITHM = "AES/GCM/NoPadding";
    private static final int TAG_LENGTH_BIT = 128; // 16 bytes
    private static final int IV_LENGTH_BYTE = 12; // 12 bytes for GCM
    private static final int SALT_LENGTH_BYTE = 16;
    private static final String SECRET_KEY_ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final int ITERATION_COUNT = 65536;
    private static final int KEY_LENGTH_BIT = 256;

    public static String generateSalt() {
        SecureRandom random = new SecureRandom();
        byte[] salt = new byte[SALT_LENGTH_BYTE];
        random.nextBytes(salt);
        return Base64.getEncoder().encodeToString(salt);
    }

    private static SecretKey getAESKeyFromPassword(char[] password, byte[] salt)
            throws NoSuchAlgorithmException, InvalidKeySpecException {
        SecretKeyFactory factory = SecretKeyFactory.getInstance(SECRET_KEY_ALGORITHM);
        KeySpec spec = new PBEKeySpec(password, salt, ITERATION_COUNT, KEY_LENGTH_BIT);
        SecretKey secret = new SecretKeySpec(factory.generateSecret(spec).getEncoded(), "AES");
        return secret;
    }

    public static String encrypt(String plainText, String masterKey, String salt) throws Exception {
        byte[] saltBytes = Base64.getDecoder().decode(salt);
        SecretKey secretKey = getAESKeyFromPassword(masterKey.toCharArray(), saltBytes);

        byte[] iv = new byte[IV_LENGTH_BYTE];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);

        Cipher cipher = Cipher.getInstance(ENCRYPTION_ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

        byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

        // Prepend IV to ciphertext
        byte[] cipherTextWithIv = new byte[iv.length + cipherText.length];
        System.arraycopy(iv, 0, cipherTextWithIv, 0, iv.length);
        System.arraycopy(cipherText, 0, cipherTextWithIv, iv.length, cipherText.length);

        return Base64.getEncoder().encodeToString(cipherTextWithIv);
    }

    public static String decrypt(String encryptedTextWithIv, String masterKey, String salt) throws Exception {
        byte[] saltBytes = Base64.getDecoder().decode(salt);
        SecretKey secretKey = getAESKeyFromPassword(masterKey.toCharArray(), saltBytes);

        byte[] decodedEncryptedTextWithIv = Base64.getDecoder().decode(encryptedTextWithIv);

        // Extract IV from the beginning of the encrypted text
        byte[] iv = new byte[IV_LENGTH_BYTE];
        System.arraycopy(decodedEncryptedTextWithIv, 0, iv, 0, iv.length);

        byte[] cipherText = new byte[decodedEncryptedTextWithIv.length - IV_LENGTH_BYTE];
        System.arraycopy(decodedEncryptedTextWithIv, IV_LENGTH_BYTE, cipherText, 0, cipherText.length);

        Cipher cipher = Cipher.getInstance(ENCRYPTION_ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(TAG_LENGTH_BIT, iv);
        cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

        byte[] plainTextBytes = cipher.doFinal(cipherText);
        return new String(plainTextBytes, StandardCharsets.UTF_8);
    }
} 