package com.financetrack.harian;

import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.android.billingclient.api.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@CapacitorPlugin(name = "FinanceBilling")
public class FinanceBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient client;
    private PluginCall purchaseCall;
    private static final String MONTHLY = "financetrack_premium_monthly";
    private static final String ANNUAL = "financetrack_premium_annual";
    private static final String LIFETIME = "financetrack_premium_lifetime";
    @Override public void load() {
        client = BillingClient.newBuilder(getContext()).setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection().build();
    }
    private void connected(PluginCall call, Runnable action) {
        getActivity().runOnUiThread(() -> {
            if (client.isReady()) { action.run(); return; }
            client.startConnection(new BillingClientStateListener() {
                public void onBillingSetupFinished(BillingResult result) {
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) action.run();
                    else { if (purchaseCall == call) purchaseCall = null; call.reject("Google Play Billing belum tersedia.", "BILLING_UNAVAILABLE"); }
                }
                public void onBillingServiceDisconnected() {}
            });
        });
    }
    private void query(String type, List<String> ids, ProductDetailsResponseListener listener) {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String id : ids) products.add(QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(type).build());
        client.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(products).build(), listener);
    }
    private ProductDetails.SubscriptionOfferDetails baseOffer(ProductDetails detail) {
        String base = detail.getProductId().equals(MONTHLY) ? "monthly" : "annual";
        if (detail.getSubscriptionOfferDetails() != null) for (ProductDetails.SubscriptionOfferDetails offer : detail.getSubscriptionOfferDetails()) {
            if (offer.getOfferId() == null && base.equals(offer.getBasePlanId())) return offer;
        }
        return null;
    }
    private JSObject product(ProductDetails detail) {
        JSObject item = new JSObject();
        item.put("productId", detail.getProductId());
        item.put("title", detail.getTitle());
        if (BillingClient.ProductType.SUBS.equals(detail.getProductType())) {
            ProductDetails.SubscriptionOfferDetails offer = baseOffer(detail);
            if (offer == null) return null;
            List<ProductDetails.PricingPhase> phases = offer.getPricingPhases().getPricingPhaseList();
            if (phases.isEmpty()) return null;
            ProductDetails.PricingPhase phase = phases.get(phases.size()-1);
            item.put("price", phase.getFormattedPrice());
            item.put("period", phase.getBillingPeriod());
        } else {
            ProductDetails.OneTimePurchaseOfferDetails offer = detail.getOneTimePurchaseOfferDetails();
            if (offer == null) return null;
            item.put("price", offer.getFormattedPrice()); item.put("period", "lifetime");
        }
        return item;
    }
    @PluginMethod public void getProducts(PluginCall call) {
        connected(call, () -> {
            JSArray items = new JSArray();
            query(BillingClient.ProductType.SUBS, Arrays.asList(MONTHLY, ANNUAL), (result, response) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("Produk langganan belum tersedia."); return; }
                for (ProductDetails detail : response.getProductDetailsList()) { JSObject item = product(detail); if (item != null) items.put(item); }
                query(BillingClient.ProductType.INAPP, Collections.singletonList(LIFETIME), (oneResult, oneResponse) -> {
                    if (oneResult.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("Produk Premium belum tersedia."); return; }
                    for (ProductDetails detail : oneResponse.getProductDetailsList()) { JSObject item = product(detail); if (item != null) items.put(item); }
                    JSObject data = new JSObject(); data.put("products", items); call.resolve(data);
                });
            });
        });
    }
    private String accountHash(String uid) throws Exception {
        byte[] digest = MessageDigest.getInstance("SHA-256").digest(uid.getBytes(StandardCharsets.UTF_8));
        StringBuilder value = new StringBuilder(); for (byte b : digest) value.append(String.format("%02x", b & 255)); return value.toString();
    }
    @PluginMethod public void purchase(PluginCall call) {
        String id = call.getString("productId"); String uid = call.getString("uid");
        if ((!MONTHLY.equals(id) && !ANNUAL.equals(id) && !LIFETIME.equals(id)) || uid == null || uid.isEmpty()) { call.reject("Produk atau akun tidak valid."); return; }
        if (purchaseCall != null) { call.reject("Pembelian sedang diproses."); return; }
        purchaseCall = call;
        String type = LIFETIME.equals(id) ? BillingClient.ProductType.INAPP : BillingClient.ProductType.SUBS;
        connected(call, () -> query(type, Collections.singletonList(id), (result, response) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || response.getProductDetailsList().isEmpty()) { purchaseCall=null; call.reject("Produk belum diaktifkan di Google Play."); return; }
            ProductDetails detail = response.getProductDetailsList().get(0);
            BillingFlowParams.ProductDetailsParams.Builder product = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(detail);
            if (BillingClient.ProductType.SUBS.equals(type)) {
                ProductDetails.SubscriptionOfferDetails offer = baseOffer(detail);
                if (offer == null) { purchaseCall=null; call.reject("Paket langganan belum aktif."); return; }
                product.setOfferToken(offer.getOfferToken());
            } else {
                if (detail.getOneTimePurchaseOfferDetails() == null) { purchaseCall=null; call.reject("Paket lifetime belum aktif."); return; }
                String token = detail.getOneTimePurchaseOfferDetails().getOfferToken();
                if (token != null && !token.isEmpty()) product.setOfferToken(token);
            }
            try {
                BillingFlowParams params = BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(product.build())).setObfuscatedAccountId(accountHash(uid)).build();
                getActivity().runOnUiThread(() -> {
                    BillingResult launched = client.launchBillingFlow(getActivity(), params);
                    if (launched.getResponseCode() != BillingClient.BillingResponseCode.OK) { purchaseCall=null; call.reject("Pembelian tidak dapat dimulai. Coba Pulihkan pembelian jika sudah dibeli."); }
                });
            } catch (Exception error) { purchaseCall=null; call.reject("Pembelian tidak dapat dimulai."); }
        }));
    }
    private JSObject purchaseData(Purchase purchase) {
        JSObject item = new JSObject(); item.put("token", purchase.getPurchaseToken());
        JSArray ids = new JSArray(); for (String id : purchase.getProducts()) ids.put(id);
        item.put("products", ids); item.put("state", purchase.getPurchaseState()); return item;
    }
    @Override public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call = purchaseCall; purchaseCall = null;
        if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            JSArray items = new JSArray(); for (Purchase purchase : purchases) items.put(purchaseData(purchase));
            JSObject data = new JSObject(); data.put("purchases", items);
            notifyListeners("purchasesUpdated", data);
            if (call != null) call.resolve(data);
        } else if (call != null) {
            if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) call.reject("Pembelian dibatalkan.","USER_CANCELED");
            else call.reject("Pembelian belum selesai. Gunakan Pulihkan pembelian.","PURCHASE_FAILED");
        }
    }
    @PluginMethod public void restore(PluginCall call) {
        connected(call, () -> {
            JSArray items = new JSArray();
            client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build(), (result, purchases) -> {
                if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("Langganan tidak dapat dipulihkan."); return; }
                for (Purchase purchase : purchases) items.put(purchaseData(purchase));
                client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(), (oneResult, onePurchases) -> {
                    if (oneResult.getResponseCode() != BillingClient.BillingResponseCode.OK) { call.reject("Pembelian tidak dapat dipulihkan."); return; }
                    for (Purchase purchase : onePurchases) items.put(purchaseData(purchase));
                    JSObject data = new JSObject(); data.put("purchases",items); call.resolve(data);
                });
            });
        });
    }
    @PluginMethod public void manageSubscriptions(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try { getActivity().startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/account/subscriptions?package=com.financetrack.harian"))); call.resolve(); }
            catch(Exception error) { call.reject("Halaman langganan tidak dapat dibuka."); }
        });
    }
    @Override protected void handleOnDestroy() { if (client != null) client.endConnection(); super.handleOnDestroy(); }
}
