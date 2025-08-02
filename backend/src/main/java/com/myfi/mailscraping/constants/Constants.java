package com.myfi.mailscraping.constants;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.myfi.model.Account.AccountType;
public class Constants {

    public static final String HDFC = "HDFC";
    public static final String HDFC_PIXEL = "HDFC Pixel";
    public static final String ONE_CARD = "OneCard";
    public static final String ICICI = "ICICI";
    public static final Map<String, List<String>> CC_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS = new HashMap<String, List<String>>() {
        {
            put(HDFC_PIXEL, new ArrayList<>(List.of("alerts@hdfcbank.net")));
            put(ONE_CARD, new ArrayList<>(List.of("no-reply@getonecard.app", "statement@getonecard.app")));
            put(ICICI, new ArrayList<>(List.of("credit_cards@icicibank.com")));
            put(HDFC, new ArrayList<>(List.of("alerts@hdfcbank.net")));
        }
    };

    public static final Map<String, List<String>> BANK_EMAIL_SCRAPING_SUPPORTED_EMAILS_IDS = new HashMap<String, List<String>>() {
        {
            put(HDFC, new ArrayList<>(List.of("alerts@hdfcbank.net")));
        }
    };

    public static final List<String> EMAIL_SCRAPING_ACCOUNTS_WITHOUT_ACC_NUMBER_IN_MAIL = new ArrayList<String>() {
        {
            add(HDFC_PIXEL);
        }
    };

    public static final Map<AccountType, List<String>> SUPPORTED_ACCOUNTS = new HashMap<AccountType, List<String>>() {
        {
            put(AccountType.SAVINGS, new ArrayList<>(List.of(HDFC, ICICI)));
            put(AccountType.CREDIT_CARD, new ArrayList<>(List.of(HDFC, HDFC_PIXEL, ONE_CARD, ICICI)));
        }
    };

    public static final String GOOGLE_OAUTH_CLIENT_ID_KEY = "GOOGLE_OAUTH_CLIENT_ID";
    public static final String GOOGLE_OAUTH_CLIENT_SECRET_KEY = "GOOGLE_OAUTH_CLIENT_SECRET";
    public static final String OPENAI_API_KEY_KEY = "OPENAI_API_KEY";
    public static final String OPEN_EXCHANGE_RATES_API_KEY_KEY = "OPEN_EXCHANGE_RATES_API_KEY";
    public static final String APP_HOST_URL_KEY = "APP_HOST_URL";
}
