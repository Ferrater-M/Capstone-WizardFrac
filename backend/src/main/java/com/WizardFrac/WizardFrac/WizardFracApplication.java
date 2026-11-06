package com.WizardFrac.WizardFrac;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class WizardFracApplication {

	public static void main(String[] args) {
		try {
			Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();
			dotenv.entries().forEach(entry -> {
				System.setProperty(entry.getKey(), entry.getValue());
			});
		} catch (Exception e) {
			System.out.println("No .env file found or unable to load it.");
		}
		useWindowsCertificatesLocally();
		SpringApplication.run(WizardFracApplication.class, args);
	}

	// On Windows (local development), trust the certificates Windows trusts instead of only Java's own list.
	// Antivirus HTTPS/mail scanning (e.g. AVG Web/Mail Shield) swaps in its own certificate, which Windows
	// trusts but Java doesn't — that made Gmail fail with "PKIX path building failed". Render runs Linux,
	// so it is untouched. Set JAVA_TRUST_WINDOWS=false in .env to turn this off.
	private static void useWindowsCertificatesLocally() {
		boolean windows = System.getProperty("os.name", "").toLowerCase().startsWith("windows");
		boolean optedOut = "false".equalsIgnoreCase(System.getProperty("JAVA_TRUST_WINDOWS", System.getenv("JAVA_TRUST_WINDOWS")));
		if (windows && !optedOut && System.getProperty("javax.net.ssl.trustStoreType") == null) {
			System.setProperty("javax.net.ssl.trustStoreType", "Windows-ROOT");
		}
	}

}
