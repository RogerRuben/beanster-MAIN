import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.HexFormat;
import java.util.List;

/** Sign using the original key, then independently verify the APK with Android apksig. */
class SignBeanster {
    static final String EXPECTED="84d4a0dd47064b819444131bf344d2d5c8b6e791a22652de593ce474497a7018";
    static String digest(byte[] bytes) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    }
    public static void main(String[] args) throws Exception {
        if(args.length!=3) throw new IllegalArgumentException("Usage: keystore unsigned.apk signed.apk");
        char[] password=System.getenv().getOrDefault("BEANSTER_STORE_PASSWORD","beanster-v11").toCharArray();
        String alias=System.getenv().getOrDefault("BEANSTER_KEY_ALIAS","sipsqueak");
        KeyStore store=KeyStore.getInstance(new File(args[0]),password);
        X509Certificate cert=(X509Certificate)store.getCertificate(alias);
        if(cert==null || !digest(cert.getEncoded()).equals(EXPECTED))
            throw new SecurityException("Certificate does not match original V17.1 signer");
        PrivateKey key=(PrivateKey)store.getKey(alias,password);
        var config=new ApkSigner.SignerConfig.Builder(alias,key,List.of(cert)).build();
        new ApkSigner.Builder(List.of(config)).setInputApk(new File(args[1]))
            .setOutputApk(new File(args[2])).setV1SigningEnabled(true)
            .setV2SigningEnabled(true).setV3SigningEnabled(true).setV4SigningEnabled(false).build().sign();
        var verified=new ApkVerifier.Builder(new File(args[2])).build().verify();
        if(!verified.isVerified() || verified.getSignerCertificates().size()!=1 ||
            !digest(verified.getSignerCertificates().get(0).getEncoded()).equals(EXPECTED)) {
            Files.deleteIfExists(Path.of(args[2]));
            throw new SecurityException("APK signature verification failed: "+verified.getErrors());
        }
        System.out.println("APK VERIFIED: v1="+verified.isVerifiedUsingV1Scheme()+
            " v2="+verified.isVerifiedUsingV2Scheme()+" v3="+verified.isVerifiedUsingV3Scheme());
        System.out.println("CERTIFICATE SHA-256: "+EXPECTED);
        System.out.println("APK SHA-256: "+digest(Files.readAllBytes(Path.of(args[2]))));
    }
}
