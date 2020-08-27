/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */
import sha256 from 'crypto-js/sha256';
import React, {useMemo, useEffect, useState} from 'react';
import DevPersistedNavigationContainer from 'navigation/DevPersistedNavigationContainer';
import MainNavigator from 'navigation/MainNavigator';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {StorageServiceProvider, useStorageService} from 'services/StorageService';
import Reactotron from 'reactotron-react-native';
import {AsyncStorage, NativeModules, StatusBar} from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import {DemoMode} from 'testMode';
import {TEST_MODE, SUBMIT_URL, RETRIEVE_URL, HMAC_KEY} from 'env';
import {ExposureNotificationServiceProvider} from 'services/ExposureNotificationService';
import {BackendService} from 'services/BackendService';
import {I18nProvider, RegionalProvider} from 'locale';
import {ThemeProvider} from 'shared/theme';
import {AccessibilityServiceProvider} from 'services/AccessibilityService';
import {captureMessage, captureException} from 'shared/log';

import regionContentDefault from './locale/translations/region.json';
import {RegionContent} from './shared/Region';

const REGION_CONTENT_KEY = 'regionContentKey';
// grabs the ip address
if (__DEV__) {
  const host = NativeModules.SourceCode.scriptURL.split('://')[1].split(':')[0];
  Reactotron.configure({host})
    .useReactNative()
    .connect();
}
interface IFetchData {
  payload: any;
}

const appInit = async () => {
  captureMessage('App.appInit()');
  SplashScreen.hide();
};

const App = async () => {
  const storageService = useStorageService();
  const backendService = useMemo(() => new BackendService(RETRIEVE_URL, SUBMIT_URL, HMAC_KEY, storageService?.region), [
    storageService,
  ]);

  const storedRegionContent = await AsyncStorage.getItem(REGION_CONTENT_KEY);
  let initialRegionContent: RegionContent = {Active: ['None'], en: '', fr: ''};
  if (storedRegionContent) {
    initialRegionContent = JSON.parse(storedRegionContent);
  } else {
    initialRegionContent = regionContentDefault as RegionContent;
  }

  const [regionContent, setRegionContent] = useState<IFetchData>({payload: initialRegionContent});
  captureMessage(JSON.stringify(regionContent));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const downloadedContent: RegionContent = await backendService.getRegionContent();
        captureMessage('server content ready');

        // @todo replace initialRegionContentHash with copy pulled from storage

        const initialRegionContentHash = sha256(JSON.stringify(initialRegionContent));
        const downloadedRegionContentHash = sha256(JSON.stringify(downloadedContent));
        if (initialRegionContentHash.toString() === downloadedRegionContentHash.toString()) {
          captureMessage('content IS the same...');
        } else {
          captureMessage('content not the same.');
          AsyncStorage.setItem(REGION_CONTENT_KEY, JSON.stringify(downloadedContent));
          setRegionContent({payload: downloadedContent});
        }
        appInit();
      } catch (error) {
        appInit();
        captureException(error.message, error);
      }
    };

    fetchData();
  }, [backendService, initialRegionContent]);

  return (
    <I18nProvider>
      <RegionalProvider activeRegions={[]} translate={id => id} regionContent={regionContent.payload}>
        <ExposureNotificationServiceProvider backendInterface={backendService}>
          <DevPersistedNavigationContainer persistKey="navigationState">
            <AccessibilityServiceProvider>
              {TEST_MODE ? (
                <DemoMode>
                  <MainNavigator />
                </DemoMode>
              ) : (
                <MainNavigator />
              )}
            </AccessibilityServiceProvider>
          </DevPersistedNavigationContainer>
        </ExposureNotificationServiceProvider>
      </RegionalProvider>
    </I18nProvider>
  );
};

const AppProvider = () => {
  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor="transparent" translucent />
      <StorageServiceProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </StorageServiceProvider>
    </SafeAreaProvider>
  );
};

export default AppProvider;
