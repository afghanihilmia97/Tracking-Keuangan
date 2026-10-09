package com.financetrack.harian;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

public class BalanceWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        String balance = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            .getString("widget_balance", "Rp 0");
        Intent openIntent = new Intent(context, MainActivity.class);
        PendingIntent open = PendingIntent.getActivity(context, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Intent addIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("financetrack://add"), context, MainActivity.class);
        PendingIntent add = PendingIntent.getActivity(context, 1, addIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        for (int widgetId : widgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.balance_widget);
            views.setTextViewText(R.id.widget_balance, balance);
            views.setOnClickPendingIntent(R.id.widget_content, open);
            views.setOnClickPendingIntent(R.id.widget_add, add);
            manager.updateAppWidget(widgetId, views);
        }
    }
}
