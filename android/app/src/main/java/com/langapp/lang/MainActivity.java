package com.langapp.lang;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

// Plain BridgeActivity doesn't grant WebView mic access on its own — a
// browser tab handles the getUserMedia() permission prompt itself, but a
// packaged WebView needs both the Android runtime permission requested and
// the WebView's own PermissionRequest explicitly granted. No other native
// plugins are installed today (see package.json), so replacing the
// WebChromeClient outright is safe; if a camera/file plugin is ever added,
// this needs to delegate to Capacitor's own BridgeWebChromeClient instead
// of replacing it, or file-chooser/camera flows will silently stop working.
public class MainActivity extends BridgeActivity {
  private static final int RECORD_AUDIO_REQUEST_CODE = 1001;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(
          this, new String[] {Manifest.permission.RECORD_AUDIO}, RECORD_AUDIO_REQUEST_CODE);
    }

    bridge
        .getWebView()
        .setWebChromeClient(
            new WebChromeClient() {
              @Override
              public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
              }
            });
  }
}
