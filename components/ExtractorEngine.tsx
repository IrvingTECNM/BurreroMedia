import React, { useRef, useState, useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface ExtractorEngineProps {
  url: string;
  onExtracted: (url: string) => void;
  onFailed: (error?: string) => void;
}

export function ExtractorEngine({ url, onExtracted, onFailed }: ExtractorEngineProps) {
  const webViewRef = useRef<WebView>(null);
  const [extracted, setExtracted] = useState(false);

  // Injected JS to scrape the video source inside the WebView
  // This JS runs inside the context of Voe/Doodstream bypassing CORS
  const injectScript = `
    (function() {
      // 1. Try to find a direct video source tag
      let tries = 0;
      const interval = setInterval(function() {
        tries++;
        
        // Voe & generic video tags
        const vid = document.querySelector('video');
        if (vid && vid.src && !vid.src.startsWith('blob:')) {
          clearInterval(interval);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'extracted', url: vid.src }));
          return;
        }

        // Search for hls inside global scripts if video tag isn't rendering yet
        const scripts = document.querySelectorAll('script');
        for(let s of scripts) {
           if(s.innerHTML.includes("'hls':")) {
             try {
                const match = s.innerHTML.match(/'hls'\\s*:\\s*'([^']+)'/);
                if (match && match[1]) {
                   clearInterval(interval);
                   window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'extracted', url: match[1] }));
                   return;
                }
             } catch(e){}
           }
        }

        if (tries > 25) { // 12 seconds max
          clearInterval(interval);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'failed', reason: 'timeout' }));
        }
      }, 500);

      // Overwrite window.open to block annoying popup ads
      window.open = function() { return null; };
    })();
    true; // Required to not throw an error in Android WebView
  `;

  if (Platform.OS === 'web') {
    // Cannot extract via WebView on Web due to CORS and react-native-web limitations.
    useEffect(() => {
      onFailed('extractor_web_unsupported');
    }, []);
    return null;
  }

  if (extracted) return null;

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        injectedJavaScript={injectScript}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'extracted' && data.url) {
              setExtracted(true);
              console.log('[ExtractorEngine] Extracted Video Source:', data.url);
              onExtracted(data.url);
            } else if (data.type === 'failed') {
              console.log('[ExtractorEngine] Extraction Failed:', data.reason);
              onFailed(data.reason);
            }
          } catch (e) {
             console.error('[ExtractorEngine] Error parsing message', e);
          }
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        setSupportMultipleWindows={false} // Block popup tabs
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenContainer: {
    width: 0,
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    position: 'absolute',
  },
});
