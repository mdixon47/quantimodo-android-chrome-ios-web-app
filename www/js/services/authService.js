angular.module('starter')

	.factory('authService', function ($http, $q, $state, $ionicLoading, $rootScope, localStorageService, utilsService) {

		var authService = {

            convertToObjectIfJsonString : function (stringOrObject) {
                try {
                    stringOrObject = JSON.parse(stringOrObject);
                } catch (e) {
                    return stringOrObject;
                }
                return stringOrObject;
            },

			// extract values from token response and saves in localstorage
			updateAccessToken: function (accessResponse) {
				if(accessResponse){
					var accessToken = accessResponse.accessToken || accessResponse.access_token;
					var expiresIn = accessResponse.expiresIn || accessResponse.expires_in;
					var refreshToken = accessResponse.refreshToken || accessResponse.refresh_token;

					// save in localStorage
					if(accessToken) {
						localStorageService.setItem('accessToken', accessToken);
                    }
					if(refreshToken) {
						localStorageService.setItem('refreshToken', refreshToken);
                    }

					console.log("expires in: ", JSON.stringify(expiresIn), parseInt(expiresIn, 10));

					// calculate expires at
					var expiresAt = new Date().getTime() + parseInt(expiresIn, 10) * 1000 - 60000;

					// save in localStorage
					if(expiresAt) {
						localStorageService.setItem('expiresAt', expiresAt);
                    }
					
					return accessToken;
				} else {
					return "";
                }
			},

			generateV1OAuthUrl: function(register) {
				var url = config.getApiUrl() + "/api/oauth2/authorize?";
				// add params
				url += "response_type=code";
				url += "&client_id="+config.getClientId();
				url += "&client_secret="+config.getClientSecret();
				url += "&scope="+config.getPermissionString();
				url += "&state=testabcd";
				if(register === true){
					url += "&register=true";
				}
				//url += "&redirect_uri=" + config.getRedirectUri();
				return url;
			},

			generateV2OAuthUrl: function(JWTToken) {
				var url = config.getURL("api/v2/bshaffer/oauth/authorize", true);
				url += "response_type=code";
				url += "&client_id=" + config.getClientId();
				url += "&client_secret=" + config.getClientSecret();
				url += "&scope=" + config.getPermissionString();
				url += "&state=testabcd";
				url += "&token=" + JWTToken;
				//url += "&redirect_uri=" + config.getRedirectUri();
				return url;
			},

			getAuthorizationCodeFromUrl: function(event) {
				console.log('extracting authorization code from event: ' + JSON.stringify(event));
                var authorizationUrl = event.url;
                if(!authorizationUrl) {
                    authorizationUrl = event.data;
                }

				var authorizationCode = utilsService.getUrlParameter(authorizationUrl, 'code');

				if(!authorizationCode) {
					authorizationCode = utilsService.getUrlParameter(authorizationUrl, 'token');
				}
				return authorizationCode;
			},
            
			// retrieves access token.
			// if expired, renews it
            getAccessTokenFromUrlParameter: function () {
                var tokenInGetParams = utilsService.getUrlParameter(location.href, 'accessToken');

                if (!tokenInGetParams) {
                    tokenInGetParams = utilsService.getUrlParameter(location.href, 'access_token');
                }
                return tokenInGetParams;
            },
            // if not logged in, returns rejects
            getAccessTokenFromAnySource: function () {

				var deferred = $q.defer();
                var tokenInGetParams = this.getAccessTokenFromUrlParameter();

				//check if token in get params
				if (tokenInGetParams) {
					localStorageService.setItem('accessToken', tokenInGetParams);
					//resolving promise using token fetched from get params
					console.log('resolving token using token url parameter', tokenInGetParams);
					deferred.resolve({
						accessToken: tokenInGetParams
					});
					return deferred.promise;
				}

				if (localStorageService.getItemSync('accessToken')) {
					//console.log('resolving token using value from local storage');
					deferred.resolve({
						accessToken: localStorageService.getItemSync('accessToken')
					});
					return deferred.promise;
				}

				if(config.getClientId() !== 'oAuthDisabled') {
					authService._defaultGetAccessToken(deferred);
					return deferred.promise;
				}

				if(config.getClientId() === 'oAuthDisabled') {
					authService.getAccessTokenFromUserEndpoint(deferred);
					return deferred.promise;
				}

			},

            getAccessTokenFromUserEndpoint: function (deferred) {
                console.log('trying to fetch user credentials with call to /api/user');
                if($rootScope.user){
                    console.warn('Are you sure we should be getting the user again when we already have a user?', $rootScope.user)
                }
                $http.get(config.getURL("api/user")).then(
                    function (userCredentialsResp) {
                        console.log('direct API call was successful. User credentials fetched:', userCredentialsResp.data);
                        Bugsnag.metaData = {
                            user: {
                                name: userCredentialsResp.data.displayName,
                                email: userCredentialsResp.data.email
                            }
                        };
                        localStorageService.setItem('user', JSON.stringify(userCredentialsResp.data));
						$rootScope.user = userCredentialsResp.data;
                        
                        //get token value from response
                        var token = userCredentialsResp.data.token.split("|")[2];
                        //update locally stored token
                        localStorageService.setItem('accessToken', token);
						$ionicLoading.hide();
                        //resolve promise
                        deferred.resolve({
                            accessToken: token
                        });

                    },
                    function (errorResp) {

                        console.debug('getAccessTokenFromUserEndpoint: failed to fetch user credentials', errorResp);
                        console.debug('getAccessTokenFromUserEndpoint: client id is ' + config.getClientId());
                        console.debug('getAccessTokenFromUserEndpoint: Platform is browser: ' + ionic.Platform.is('browser'));
                        console.debug('getAccessTokenFromUserEndpoint: Platform is ios: ' + ionic.Platform.is('ios'));
                        console.debug('getAccessTokenFromUserEndpoint: Platform is android: ' + ionic.Platform.is('android'));
						$rootScope.user = null;
						localStorageService.deleteItem('user');
						$state.go('app.login');
                    }
                );
            },

			// get access token from authorization code
			getAccessTokenFromAuthorizationCode: function (authorizationCode) {
				console.log("Authorization code is " + authorizationCode);

				var deferred = $q.defer();

				var url = config.getURL("api/oauth2/token");

				// make request
				var request = {
					method: 'POST',
					url: url,
					responseType: 'json',
					headers: {
						'Content-Type': "application/json"
					},
					data: {
						client_id: config.getClientId(),
						client_secret: config.getClientSecret(),
						grant_type: 'authorization_code',
						code: authorizationCode,
						redirect_uri: config.getRedirectUri()
					}
				};

				console.log('getAccessTokenFromAuthorizationCode: request is ', request);
				console.log(JSON.stringify(request));

				// post
				$http(request).success(function (response) {
					console.log('getAccessTokenFromAuthorizationCode: Successful response is ', response);
					console.log(JSON.stringify(response));
					deferred.resolve(response);
				}).error(function (response) {
					console.log('getAccessTokenFromAuthorizationCode: Error response is ', response);
					console.log(JSON.stringify(response));
					deferred.reject(response);
				});

				return deferred.promise;
			},

        checkAuthOrSendToLogin: function() {
            var user = localStorageService.getItemAsObject('user');
            if(user){
                   return true;
               }
            var accessTokenInUrl = authService.getAccessTokenFromUrlParameter;
            if(accessTokenInUrl){
				$rootScope.getUserAndSetInLocalStorage();
                   return true;
               }
            if(!user && !accessTokenInUrl){
                   $ionicLoading.hide();
                   console.debug('checkAuthOrSendToLogin: Could not get user or access token from url. Going to login page...');
                   $state.go('app.login');
               }
        },

        getJWTToken: function (provider, accessToken) {
				var deferred = $q.defer();

				if(!accessToken || accessToken === "null" || accessToken === null){
					Bugsnag.notify("No accessToken", "accessToken not provided to getJWTToken function", {}, "error");
					deferred.reject();
				}
				var url = config.getURL('api/v2/auth/social/authorizeToken');

				url += "provider=" + provider;
				url += "&accessToken=" + accessToken;

				$http({
					method: 'GET',
					url: url,
					headers: {
						'Content-Type': 'application/json'
					}
				}).then(function (response) {
					if (response.data.success && response.data.data && response.data.data.token) {
						deferred.resolve(response.data.data.token);
					} else {
                        deferred.reject(response);
                    }
				}, function (response) {
					deferred.reject(response);
				});

				return deferred.promise;
			},

			_defaultGetAccessToken: function (deferred) {

				console.log('access token resolving flow');

				var now = new Date().getTime();
				var expiresAt = localStorageService.getItemSync('expiresAt');
				var refreshToken = localStorageService.getItemSync('refreshToken');
				var accessToken = localStorageService.getItemSync('accessToken');

				console.log('Values from local storage:', {
					expiresAt: expiresAt,
					refreshToken: refreshToken,
					accessToken: accessToken
				});

				// get expired time
				if (now < expiresAt) {

					console.log('Current token should not be expired');
					// valid token
					console.log('Resolving token using value from local storage');

					deferred.resolve({
						accessToken: accessToken
					});

				} else if (refreshToken) {
                    authService.refreshAccessToken(refreshToken, deferred);
				} else {
					localStorage.removeItem('accessToken');
					console.warn('Refresh token is undefined. Not enough data for oauth flow. rejecting token promise. ' +
						'Clearing accessToken from local storage if it exists and sending to login page...');
                    $state.go('app.login');
					deferred.reject();
				}

			},

            refreshAccessToken: function(refreshToken, deferred) {
                console.log('Refresh token will be used to fetch access token from ' +
                    config.getURL("api/oauth2/token") + ' with client id ' + config.getClientId());

                var url = config.getURL("api/oauth2/token");

                //expire token, refresh
                $http.post(url, {

                    client_id: config.getClientId(),
                    client_secret: config.getClientSecret(),
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token'
                }).success(function (data) {
                    // update local storage
                    if (data.error) {
                        console.log('Token refresh failed: ' + data.error);
                        deferred.reject('refresh failed');
                    } else {
                        var accessTokenRefreshed = authService.updateAccessToken(data);

                        console.log('access token successfully updated from api server', data);
                        console.log('resolving toke using response value');
                        // respond
                        deferred.resolve({
                            accessToken: accessTokenRefreshed
                        });
                    }

                }).error(function (response) {
                    console.log("failed to refresh token from api server", response);
                    // error refreshing
                    deferred.reject(response);
                });

            },

			apiGet: function(baseURL, allowedParams, params, successHandler, errorHandler){
				authService.getAccessTokenFromAnySource().then(function(token){

					// configure params
					var urlParams = [];
					for (var key in params)
					{
						if (jQuery.inArray(key, allowedParams) === -1)
						{
							throw 'invalid parameter; allowed parameters: ' + allowedParams.toString();
						}
						urlParams.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
					}

					// configure request
					var url = config.getURL(baseURL);
					var request = {};
					if(config.getClientId() !== 'oAuthDisabled') {
						request = {
							method : 'GET',
							url: (url + ((urlParams.length === 0) ? '' : urlParams.join('&'))),
							responseType: 'json',
							headers : {
								"Authorization" : "Bearer " + token.accessToken,
								'Content-Type': "application/json"
							}
						};
					} else {
						request = {
							method: 'GET',
							url: (url + ((urlParams.length === 0) ? '' : urlParams.join('&'))),
							responseType: 'json',
							headers: {
								'Content-Type': "application/json"
							}
						};
					}

					console.log("Making request with this token " + token.accessToken);

					$http(request).success(successHandler).error(function(data,status,headers,config){
						var error = "Error";
						if (data && data.error && data.error.message) {
                            error = data.error.message;
                        }
                        console.error("API Request to "+request.url+" Failed",error,{},"error");
						Bugsnag.notify("API Request to "+request.url+" Failed",error,{},"error");
						errorHandler(data,status,headers,config);
					});

				});
			},
			utilsService: utilsService
		};

		return authService;
	});
