package com.myfi.mailscraping.constants;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Constants {

    public static final String HDFC_PIXEL = "HDFC Pixel";
    public static final String ONE_CARD = "OneCard";
    public static final Map<String, List<String>> SUPPORTED_BANK_EMAILS = new HashMap<String, List<String>>() {
        {
            put(HDFC_PIXEL, new ArrayList<>(List.of("alerts@hdfcbank.net")));
            put(ONE_CARD, new ArrayList<>(List.of("no-reply@getonecard.app", "statement@getonecard.app")));
        }
    };
}
