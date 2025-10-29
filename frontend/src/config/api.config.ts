```typescript

import Constants from 'expo-constants';

import { Platform } from 'react-native';

// Use backend proxy for both web and native platforms

const getBaseURL = () => {

if (Platform.OS === 'web') {

// Use relative path for web browsers

return '/api/proxy';

} else {

// Use backend URL from environment for native iOS/Android

const backendUrl = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL;

return `${backendUrl}/api/proxy`;

}

};

export const API_CONFIG = {

baseURL: getBaseURL(),

timeout: 30000,

headers: {

'Content-Type': 'application/json',

'Accept': 'application/json',

},

};

export const TOKEN_CONFIG = {

accessTokenKey: 'irememberit_access_token',

refreshTokenKey: 'irememberit_refresh_token',

userKey: 'irememberit_user',

};

```
