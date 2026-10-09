package com.financetrack.harian;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FinanceBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
