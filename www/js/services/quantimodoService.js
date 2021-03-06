angular.module('starter').factory('quantimodoService', function($http, $q, $rootScope, $ionicPopup, $state, $timeout, $ionicPlatform, $mdDialog,
                                           $cordovaGeolocation, CacheFactory, $ionicLoading, Analytics, wikipediaFactory, $ionicHistory, $ionicActionSheet) {
    var quantimodoService = {};
    quantimodoService.ionIcons = {
        history: 'ion-ios-list-outline',
        reminder: 'ion-android-notifications-none',
        recordMeasurement: 'ion-compose',
        charts: 'ion-arrow-graph-up-right',
        settings: 'ion-settings',
        help: 'ion-help'
    };
    $rootScope.offlineConnectionErrorShowing = false; // to prevent more than one popup
    // GET method with the added token
    function addGlobalUrlParams(urlParams) {
        urlParams.push(encodeURIComponent('appName') + '=' + encodeURIComponent(config.appSettings.appDisplayName));
        urlParams.push(encodeURIComponent('appVersion') + '=' + encodeURIComponent(config.appSettings.versionNumber));
        urlParams.push(encodeURIComponent('client_id') + '=' + encodeURIComponent(quantimodoService.getClientId()));
        if(window.developmentMode && window.devCredentials){
            if(window.devCredentials.username){urlParams.push(encodeURIComponent('log') + '=' + encodeURIComponent(window.devCredentials.username));}
            if(window.devCredentials.password){urlParams.push(encodeURIComponent('pwd') + '=' + encodeURIComponent(window.devCredentials.password));}
        }
        if(quantimodoService.getUrlParameter('userId')){urlParams.push(encodeURIComponent('userId') + '=' + quantimodoService.getUrlParameter('userId'));}
        //We can't append access token to Ionic requests for some reason
        //urlParams.push(encodeURIComponent('access_token') + '=' + encodeURIComponent(tokenObject.accessToken));
        if(quantimodoService.getUrlParameter('log')){urlParams.push(encodeURIComponent('log') + '=' + quantimodoService.getUrlParameter('log'));}
        if(quantimodoService.getUrlParameter('pwd')){urlParams.push(encodeURIComponent('pwd') + '=' + quantimodoService.getUrlParameter('pwd'));}
        return urlParams;
    }
    function addVariableCategoryInfo(array){
        angular.forEach(array, function(value, key) {
            if(!value){console.error("no value for key " + key + " in array " + JSON.stringify(array));}
            if(value && value.variableCategoryName && quantimodoService.variableCategories[value.variableCategoryName]){
                value.iconClass = 'icon positive ' + quantimodoService.variableCategories[value.variableCategoryName].ionIcon;
                value.ionIcon = quantimodoService.variableCategories[value.variableCategoryName].ionIcon;
                value.moreInfo = quantimodoService.variableCategories[value.variableCategoryName].moreInfo;
                value.image = {
                    url: quantimodoService.variableCategories[value.variableCategoryName].imageUrl,
                    height: "96",
                    width: "96"
                };
            }
        });
        return array;
    }
    function addColors(array){
        angular.forEach(array, function(value, key) {
            if(!value){console.error("no value for key " + key + " in array " + JSON.stringify(array));}
            if(value && value.color && quantimodoService.colors[value.color]){value.color = quantimodoService.colors[value.color];}
        });
        return array;
    }
    function toObject(arr) {
        var rv = {};
        for (var i = 0; i < arr.length; ++i) {
            rv[i] = arr[i];
        }
        return rv;
    }


    function addVariableCategoryStateParam(object){
        if(typeof object !== "object"){
            console.error("not an object", object);
            return object;
        }
        for (var prop in object) {
            // skip loop if the property is from prototype
            if(!object.hasOwnProperty(prop)) continue;
            if(object[prop].stateParameters){
                if(object[prop].stateParameters.constructor === Array){
                    console.error('stateParams should be an object!');
                    object[prop].stateParameters = toObject(object[prop].stateParameters);
                }
                if(!object[prop].stateParameters.variableCategoryName){
                    object[prop].stateParameters.variableCategoryName = "Anything";
                }
            }
        }
        return object;
    }
    function addAppDisplayName(array){return JSON.parse(JSON.stringify(array).replace('__APP_DISPLAY_NAME__', config.appSettings.appDisplayName));}
    quantimodoService.addColorsCategoriesAndNames = function(array){
        array = addVariableCategoryInfo(array);
        array = addColors(array);
        array = addAppDisplayName(array);
        array = addVariableCategoryStateParam(array);
        return array;
    };
    quantimodoService.get = function(route, allowedParams, params, successHandler, requestSpecificErrorHandler, options){
        if(!successHandler){throw "Please provide successHandler function as fourth parameter in quantimodoService.get";}
        if(!options){ options = {}; }
        var cache = false;
        if(params && params.cache){
            cache = params.cache;
            params.cache = null;
        }
        if(!canWeMakeRequestYet('GET', route, options) && !params.force){
            if(requestSpecificErrorHandler){requestSpecificErrorHandler();}
            return;
        }
        if($state.current.name === 'app.intro' && !params.force){
            console.warn('Not making request to ' + route + ' user because we are in the intro state');
            return;
        }
        delete params.force;
        quantimodoService.getAccessTokenFromAnySource().then(function(accessToken) {
            allowedParams.push('limit');
            allowedParams.push('offset');
            allowedParams.push('sort');
            allowedParams.push('updatedAt');
            // configure params
            var urlParams = [];
            for (var property in params) {
                if (params.hasOwnProperty(property)) {
                    if (typeof params[property] !== "undefined" && params[property] !== null) {
                        urlParams.push(encodeURIComponent(property) + '=' + encodeURIComponent(params[property]));
                    } else {
                        //console.warn("Not including parameter " + property + " in request because it is null or undefined");
                    }
                }
            }
            urlParams = addGlobalUrlParams(urlParams);
            var request = {method: 'GET', url: (quantimodoService.getQuantiModoUrl(route) + ((urlParams.length === 0) ? '' : '?' + urlParams.join('&'))), responseType: 'json', headers: {'Content-Type': "application/json"}};
            if(cache){ request.cache = cache; }
            if (accessToken) {request.headers = {"Authorization": "Bearer " + accessToken, 'Content-Type': "application/json"};}
            console.debug('GET ' + request.url);
            $http(request)
                .success(function (data, status, headers) {
                    console.debug("Got " + route + " " + status + " response: " + ': ' +  JSON.stringify(data).substring(0, 140) + '...');
                    if(!data) {
                        if (typeof Bugsnag !== "undefined") {
                            var groupingHash = 'No data returned from this request';
                            Bugsnag.notify(groupingHash, status + " response from url " + request.url, {groupingHash: groupingHash}, "error");
                        }
                    } else if (data.error) {
                        quantimodoService.generalApiErrorHandler(data, status, headers, request, options);
                        requestSpecificErrorHandler(data);
                    } else {
                        quantimodoService.successHandler(data, route, status);
                        successHandler(data);
                    }
                })
                .error(function (data, status, headers) {
                    quantimodoService.generalApiErrorHandler(data, status, headers, request, options);
                    requestSpecificErrorHandler(data);
                }, onRequestFailed);
        });
    };
    quantimodoService.post = function(route, requiredFields, body, successHandler, requestSpecificErrorHandler, options){
        if(!body){throw "Please provide body parameter to quantimodoService.post";}
        if(!canWeMakeRequestYet('POST', route, options)){
            if(requestSpecificErrorHandler){requestSpecificErrorHandler();}
            return;
        }
        if($rootScope.offlineConnectionErrorShowing){ $rootScope.offlineConnectionErrorShowing = false; }
        console.debug('quantimodoService.post: About to try to post request to ' + route + ' with body: ' + JSON.stringify(body).substring(0, 140));
        quantimodoService.getAccessTokenFromAnySource().then(function(accessToken){
            for (var i = 0; i < body.length; i++) {
                var item = body[i];
                for (var j = 0; j < requiredFields.length; j++) {
                    if (!(requiredFields[j] in item)) {
                        quantimodoService.bugsnagNotify('Missing required field', requiredFields[j] + ' in ' + route + ' request!', body);
                        //throw 'missing required field in POST data; required fields: ' + requiredFields.toString();
                    }
                }
            }
            var url = quantimodoService.getQuantiModoUrl(route) + '?' + addGlobalUrlParams([]).join('&');
            var request = {method : 'POST', url: url, responseType: 'json', headers : {'Content-Type': "application/json", 'Accept': "application/json"}, data : JSON.stringify(body)};
            if(accessToken) {request.headers = {"Authorization" : "Bearer " + accessToken, 'Content-Type': "application/json", 'Accept': "application/json"};}
            $http(request).success(successHandler).error(function(data, status, headers){
                quantimodoService.generalApiErrorHandler(data, status, headers, request, options);
                if(requestSpecificErrorHandler){requestSpecificErrorHandler(data);}
            });
        }, requestSpecificErrorHandler);
    };
    quantimodoService.successHandler = function(data, baseURL, status){
        var maxLength = 140;
        if($rootScope.offlineConnectionErrorShowing){ $rootScope.offlineConnectionErrorShowing = false; }
        if(data.message){ console.warn(data.message); }
    };
    quantimodoService.generalApiErrorHandler = function(data, status, headers, request, options){
        console.error("error response from " + request.url);
        if(status === 302){
            console.warn('Got 302 response from ' + JSON.stringify(request));
            return;
        }
        if(status === 401){
            if(options && options.doNotSendToLogin){
                return;
            } else {
                console.warn('quantimodoService.generalApiErrorHandler: Sending to login because we got 401 with request ' + JSON.stringify(request));
                quantimodoService.setLocalStorageItem('afterLoginGoTo', window.location.href);
                console.debug("set afterLoginGoTo to " + window.location.href);
                if (window.private_keys && quantimodoService.getClientId() !== 'oAuthDisabled') {
                    quantimodoService.sendToLogin();
                } else {
                    var register = true;
                    quantimodoService.sendToNonOAuthBrowserLoginUrl(register);
                }
                return;
            }
        }
        var pathWithQuery = request.url.match(/\/\/[^\/]+\/([^\.]+)/)[1];
        var name = status + ' from ' + request.method + ' ' + pathWithQuery.split("?")[0];
        var message = status + ' from ' + request.method + ' ' + request.url + ' DATA:' + JSON.stringify(data) ;
        var metaData = {groupingHash: name, data: data, status: status, request: request, options: options, currentUrl: window.location.href,
            requestParams: getAllQueryParamsFromUrlString(request.url)};
        var severity = 'error';
        console.error(message);
        if(status > -1 || !isTestUser()){
            if(!envIsDevelopment()){Bugsnag.notify(name, message, metaData, severity);}
        }
        if(!data){
            var doNotShowOfflineError = false;
            if(options && options.doNotShowOfflineError){doNotShowOfflineError = true;}
            if (!$rootScope.offlineConnectionErrorShowing && !doNotShowOfflineError) {
                console.error("Showing offline indicator because no data was returned from this request: "  + JSON.stringify(request));
                $rootScope.offlineConnectionErrorShowing = true;
                if($rootScope.isIOS){
                    $ionicPopup.show({
                        title: 'NOT CONNECTED',
                        //subTitle: '',
                        template: 'Either you are not connected to the internet or the QuantiModo server cannot be reached.',
                        buttons:[{text: 'OK', type: 'button-positive', onTap: function(){$rootScope.offlineConnectionErrorShowing = false;}}]
                    });
                }
            }
            return;
        }
        if (typeof Bugsnag !== "undefined") {
            metaData.groupingHash = "There was an error and the request object was not provided to the quantimodoService.generalApiErrorHandler";
            if(request){metaData.groupingHash = request.url + ' error';}
            if(data.error){
                metaData.groupingHash = JSON.stringify(data.error);
                if(data.error.message){metaData.groupingHash = JSON.stringify(data.error.message);}
            }
            Bugsnag.notify(metaData.groupingHash, status + " response from " + request.url + '. DATA: ' + JSON.stringify(data), metaData, "error");
        }
        console.error(status + " response from " + request.url + '. DATA: ' + JSON.stringify(data));
        if(data.success){console.error('Called error handler even though we have data.success');}
    };
    // Handler when request is failed
    var onRequestFailed = function(error){
        if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
        console.error("Request error : " + error);
    };
    var canWeMakeRequestYet = function(type, route, options){
        var blockRequests = false;
        var minimumSecondsBetweenRequests;
        if(options && options.minimumSecondsBetweenRequests){minimumSecondsBetweenRequests = options.minimumSecondsBetweenRequests;} else {minimumSecondsBetweenRequests = 1;}
        var requestVariableName = 'last_' + type + '_' + route.replace('/', '_') + '_request_at';
        if(localStorage.getItem(requestVariableName) && localStorage.getItem(requestVariableName) > Math.floor(Date.now() / 1000) - minimumSecondsBetweenRequests){
            var name = 'Just made a ' + type + ' request to ' + route;
            var message = name + " because " + "we made the same request within the last " + minimumSecondsBetweenRequests + ' seconds';
            var metaData = {type: type, route: route, groupingHash: name, state: $state.current};
            if(options){metaData.options = options;}
            console.error(message);
            if(!isTestUser()){Bugsnag.notify(name, message, metaData, "error");}
            if(blockRequests){return false;}
        }
        localStorage.setItem(requestVariableName, Math.floor(Date.now() / 1000));
        return true;
    };
    function getCurrentFunctionName() {
        var myName = arguments.callee.toString();
        myName = myName.substr('function '.length);
        myName = myName.substr(0, myName.indexOf('('));
        alert(myName);
    }
    function getCache(cacheName, minutesToLive){
        var cacheOptions = {deleteOnExpire: 'aggressive', recycleFreq: 60000, maxAge: minutesToLive * 60 * 1000};
        if (!CacheFactory.get(cacheName)) {CacheFactory.createCache(cacheName, cacheOptions);}
        return CacheFactory.get(cacheName);
    }
    function deleteCache(cacheName) {
        if (!CacheFactory.get(cacheName)) {return;}
        var dataCache = CacheFactory.get(cacheName);
        dataCache.destroy();
    }
    quantimodoService.getMeasurementsFromApi = function(params, successHandler, errorHandler){
        quantimodoService.get('api/v1/measurements', ['source', 'limit', 'offset', 'sort', 'id', 'variableCategoryName', 'variableName'],
            params, successHandler, errorHandler);
    };
    quantimodoService.getMeasurementsDeferred = function(params, refresh){
        var deferred = $q.defer();
        if(!refresh){
            var cachedMeasurements = quantimodoService.getCachedResponse('getV1Measurements', params);
            if(cachedMeasurements){
                deferred.resolve(cachedMeasurements);
                return deferred.promise;
            }
        }
        if(refresh){
            //deleteCache(getCurrentFunctionName());
        }
        //params.cache = getCache(getCurrentFunctionName(), 15);
        quantimodoService.getMeasurementsFromApi(params, function(response){
            quantimodoService.storeCachedResponse('getMeasurementsFromApi', params, response);
            deferred.resolve(quantimodoService.addInfoAndImagesToMeasurements(response));
        }, function(error){
            if (typeof Bugsnag !== "undefined") {Bugsnag.notify(error, JSON.stringify(error), {}, "error");}
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.getMeasurementById = function(measurementId){
        var deferred = $q.defer();
        var params = {id : measurementId};
        quantimodoService.getMeasurementsFromApi(params, function(response){
            var measurementArray = response;
            if(!measurementArray[0]){
                console.debug('Could not get measurement with id: ' + measurementId);
                deferred.reject();
            }
            var measurementObject = measurementArray[0];
            deferred.resolve(measurementObject);
        }, function(error){
            if (typeof Bugsnag !== "undefined") {Bugsnag.notify(error, JSON.stringify(error), {}, "error");}
            console.debug(error);
            deferred.reject();
        });
        return deferred.promise;
    };
    quantimodoService.getMeasurementsDailyFromApi = function(params, successHandler, errorHandler){
        quantimodoService.get('api/v1/measurements/daily',
            ['source', 'limit', 'offset', 'sort', 'id', 'variableCategoryName', 'variableName'], params, successHandler, errorHandler);
    };
    quantimodoService.getMeasurementsDailyFromApiDeferred = function(params, successHandler, errorHandler){
        var deferred = $q.defer();
        quantimodoService.getMeasurementsDailyFromApi(params, function(dailyHistory){deferred.resolve(dailyHistory);}, function(error){deferred.reject(error);});
        return deferred.promise;
    };

    quantimodoService.deleteV1Measurements = function(measurements, successHandler, errorHandler){
        quantimodoService.post('api/v1/measurements/delete', ['variableId', 'variableName', 'startTimeEpoch', 'id'], measurements, successHandler, errorHandler);
    };
    quantimodoService.postMeasurementsExport = function(type) {
        quantimodoService.post('api/v2/measurements/request_' + type, [], [], quantimodoService.successHandler, quantimodoService.generalApiErrorHandler);
    };
    // post new Measurements for user
    quantimodoService.postMeasurementsToApi = function(measurementSet, successHandler, errorHandler){
        quantimodoService.post('api/v1/measurements',
            //['measurements', 'variableName', 'source', 'variableCategoryName', 'unitAbbreviatedName'],
            [], measurementSet, successHandler, errorHandler);

    };
    quantimodoService.logoutOfApi = function(successHandler, errorHandler){
        //TODO: Fix this
        console.debug('Logging out of api does not work yet.  Fix it!');
        quantimodoService.get('api/v2/auth/logout', [], {}, successHandler, errorHandler);
    };
    quantimodoService.getAggregatedCorrelationsFromApi = function(params, successHandler, errorHandler){
        var options = {};
        quantimodoService.get('api/v1/aggregatedCorrelations', ['correlationCoefficient', 'causeVariableName', 'effectVariableName'], params, successHandler, errorHandler, options);
    };
    quantimodoService.getNotesFromApi = function(params, successHandler, errorHandler){
        var options = {};
        quantimodoService.get('api/v1/notes', ['variableName'], params, successHandler, errorHandler, options);
    };
    quantimodoService.getUserCorrelationsFromApi = function (params, successHandler, errorHandler) {
        var options = {};
        //options.cache = getCache(getCurrentFunctionName(), 15);
        quantimodoService.get('api/v3/correlations', ['correlationCoefficient', 'causeVariableName', 'effectVariableName'], params, successHandler, errorHandler);
    };
    quantimodoService.postCorrelationToApi = function(correlationSet, successHandler ,errorHandler){
        quantimodoService.post('api/v1/correlations', ['causeVariableName', 'effectVariableName', 'correlation', 'vote'], correlationSet, successHandler, errorHandler);
    };
    quantimodoService.postVoteToApi = function(correlationSet, successHandler ,errorHandler){
        quantimodoService.post('api/v1/votes', ['causeVariableName', 'effectVariableName', 'correlation', 'vote'], correlationSet, successHandler, errorHandler);
    };
    quantimodoService.deleteVoteToApi = function(correlationSet, successHandler ,errorHandler){
        quantimodoService.post('api/v1/votes/delete', ['causeVariableName', 'effectVariableName', 'correlation'], correlationSet, successHandler, errorHandler);
    };
    quantimodoService.searchUserVariablesFromApi = function(query, params, successHandler, errorHandler){
        var options = {};
        //options.cache = getCache(getCurrentFunctionName(), 15);
        quantimodoService.get('api/v1/variables/search/' + encodeURIComponent(query), ['limit','includePublic', 'manualTracking'], params, successHandler, errorHandler, options);
    };
    quantimodoService.getVariablesByNameFromApi = function(variableName, params, successHandler, errorHandler){
        var options = {};
        //options.cache = getCache(getCurrentFunctionName(), 15);
        quantimodoService.get('api/v1/variables/' + encodeURIComponent(variableName), [], params, successHandler, errorHandler, options);
    };
    quantimodoService.getVariableByIdFromApi = function(variableId, successHandler, errorHandler){
        quantimodoService.get('api/v1/variables' , ['id'], {id: variableId}, successHandler, errorHandler);
    };
    quantimodoService.getUserVariablesFromApi = function(params, successHandler, errorHandler){
        var options = {};
        //options.cache = getCache(getCurrentFunctionName(), 15);
        if(!params){params = {};}
        if(!params.limit){params.limit = 200;}
        if(params.variableCategoryName && params.variableCategoryName === 'Anything'){params.variableCategoryName = null;}
        quantimodoService.get('api/v1/variables', ['variableCategoryName', 'limit'], params, successHandler, errorHandler);
    };
    quantimodoService.postUserVariableToApi = function(userVariable, successHandler, errorHandler) {
        quantimodoService.post('api/v1/userVariables',
            [
                'user',
                'variableId',
                'durationOfAction',
                'fillingValue',
                'joinWith',
                'maximumAllowedValue',
                'minimumAllowedValue',
                'onsetDelay',
                'experimentStartTime',
                'experimentEndTime'
            ], userVariable, successHandler, errorHandler);
    };
    quantimodoService.resetUserVariable = function(body, successHandler, errorHandler) {
        quantimodoService.post('api/v1/userVariables/reset', ['variableId'], body, successHandler, errorHandler);
    };
    quantimodoService.deleteUserVariableMeasurements = function(variableId, successHandler, errorHandler) {
        quantimodoService.deleteElementsOfLocalStorageItemByProperty('userVariables', 'variableId', variableId);
        quantimodoService.deleteElementOfLocalStorageItemById('commonVariables', variableId);
        quantimodoService.post('api/v1/userVariables/delete', ['variableId'], {variableId: variableId}, successHandler, errorHandler);
    };
    quantimodoService.getConnectorsFromApi = function(successHandler, errorHandler){
        quantimodoService.get('api/v1/connectors/list', [], {}, successHandler, errorHandler);
    };
    quantimodoService.disconnectConnectorToApi = function(name, successHandler, errorHandler){
        quantimodoService.get('api/v1/connectors/' + name + '/disconnect', [], {}, successHandler, errorHandler);
    };
    quantimodoService.connectConnectorWithParamsToApi = function(params, lowercaseConnectorName, successHandler, errorHandler){
        var allowedParams = ['location', 'username', 'password', 'email'];
        quantimodoService.get('api/v1/connectors/' + lowercaseConnectorName + '/connect', allowedParams, params, successHandler, errorHandler);
    };
    quantimodoService.connectConnectorWithTokenToApi = function(body, lowercaseConnectorName, successHandler, errorHandler){
        var requiredProperties = ['connector', 'connectorCredentials'];
        quantimodoService.post('api/v1/connectors/connect', requiredProperties, body, successHandler, errorHandler);
    };
    quantimodoService.connectWithAuthCodeToApi = function(code, connectorLowercaseName, successHandler, errorHandler){
        var allowedParams = ['code', 'noRedirect'];
        var params = {noRedirect: true, code: code};
        quantimodoService.get('api/v1/connectors/' + connectorLowercaseName + '/connect', allowedParams, params, successHandler, errorHandler);
    };
    quantimodoService.getUserFromApi = function(successHandler, errorHandler){
        if($rootScope.user){console.warn('Are you sure we should be getting the user again when we already have a user?', $rootScope.user);}
        var options = {};
        options.minimumSecondsBetweenRequests = 3;
        options.doNotSendToLogin = true;
        quantimodoService.get('api/user/me', [], {}, successHandler, errorHandler, options);
    };
    quantimodoService.getUserEmailPreferences = function(params, successHandler, errorHandler){
        if($rootScope.user){console.warn('Are you sure we should be getting the user again when we already have a user?', $rootScope.user);}
        var options = {};
        options.minimumSecondsBetweenRequests = 10;
        options.doNotSendToLogin = true;
        quantimodoService.get('api/v1/notificationPreferences', ['userEmail'], params, successHandler, errorHandler, options);
    };
    quantimodoService.getTrackingReminderNotificationsFromApi = function(params, successHandler, errorHandler){
        quantimodoService.get('api/v1/trackingReminderNotifications', ['variableCategoryName', 'reminderTime', 'sort', 'reminderFrequency'], params, successHandler, errorHandler);
    };
    quantimodoService.postTrackingReminderNotificationsToApi = function(trackingReminderNotificationsArray, successHandler, errorHandler) {
        if(!trackingReminderNotificationsArray){
            successHandler();
            return;
        }
        if(trackingReminderNotificationsArray.constructor !== Array){trackingReminderNotificationsArray = [trackingReminderNotificationsArray];}
        var options = {};
        options.doNotSendToLogin = false;
        options.doNotShowOfflineError = true;
        quantimodoService.post('api/v1/trackingReminderNotifications', [], trackingReminderNotificationsArray, successHandler, errorHandler, options);
    };
    quantimodoService.getTrackingRemindersFromApi = function(params, successHandler, errorHandler){
        quantimodoService.get('api/v1/trackingReminders', ['variableCategoryName', 'id'], params, successHandler, errorHandler);
    };
    quantimodoService.getStudy = function(params, successHandler, errorHandler){
        quantimodoService.get('api/v1/study', [], params, successHandler, errorHandler);
    };
    quantimodoService.postUserSettings = function(params, successHandler, errorHandler) {
        quantimodoService.post('api/v1/userSettings', [], params, successHandler, errorHandler);
    };
    quantimodoService.postTrackingRemindersToApi = function(trackingRemindersArray, successHandler, errorHandler) {
        if(trackingRemindersArray.constructor !== Array){trackingRemindersArray = [trackingRemindersArray];}
        var d = new Date();
        for(var i = 0; i < trackingRemindersArray.length; i++){trackingRemindersArray[i].timeZoneOffset = d.getTimezoneOffset();}
        quantimodoService.post('api/v1/trackingReminders', [], trackingRemindersArray, successHandler, errorHandler);
    };
    quantimodoService.postStudy = function(body, successHandler, errorHandler){
        quantimodoService.post('api/v1/study', [], body, successHandler, errorHandler);
    };
    quantimodoService.postStudyDeferred = function(body) {
        var deferred = $q.defer();
        quantimodoService.postStudy(body, function(){deferred.resolve();}, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.joinStudy = function(body, successHandler, errorHandler){
        quantimodoService.post('api/v1/study/join', [], body, successHandler, errorHandler);
    };
    quantimodoService.joinStudyDeferred = function(body) {
        var deferred = $q.defer();
        quantimodoService.joinStudy(body, function(response){
            if(response && response.data){
                if(response.data.trackingReminderNotifications){putTrackingReminderNotificationsInLocalStorageAndUpdateInbox(response.data.trackingReminderNotifications);}
                if(response.data.trackingReminders){quantimodoService.setLocalStorageItem('trackingReminders', JSON.stringify(response.data.trackingReminders));}
                if(response.data.causeUserVariable && response.data.effectUserVariable){
                    quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('userVariables', [response.data.causeUserVariable, response.data.effectUserVariable]);
                }
            }
            deferred.resolve();
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.postUserTagDeferred = function(tagData) {
        var deferred = $q.defer();
        quantimodoService.postUserTag(tagData, function(response){
            quantimodoService.addVariableToLocalStorage(response.data.userTaggedVariable);
            quantimodoService.addVariableToLocalStorage(response.data.userTagVariable);
            deferred.resolve(response);
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.postUserTag = function(userTagData, successHandler, errorHandler) {
        if(userTagData.constructor !== Array){userTagData = [userTagData];}
        quantimodoService.post('api/v1/userTags', [], userTagData, successHandler, errorHandler);
    };
    quantimodoService.postVariableJoinDeferred = function(tagData) {
        var deferred = $q.defer();
        quantimodoService.postVariableJoin(tagData, function(response){
            quantimodoService.addVariableToLocalStorage(response.data.parentVariable);
            quantimodoService.addVariableToLocalStorage(response.data.joinedVariable);
            deferred.resolve(response);
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.postVariableJoin = function(variableJoinData, successHandler, errorHandler) {
        if(variableJoinData.constructor !== Array){variableJoinData = [variableJoinData];}
        quantimodoService.post('api/v1/variables/join', [], variableJoinData, successHandler, errorHandler);
    };
    quantimodoService.deleteVariableJoinDeferred = function(tagData) {
        var deferred = $q.defer();
        quantimodoService.deleteVariableJoin(tagData, function(response){
            quantimodoService.addVariableToLocalStorage(response.data.parentVariable);
            quantimodoService.addVariableToLocalStorage(response.data.joinedVariable);
            deferred.resolve(response);
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.deleteVariableJoin = function(variableJoinData, successHandler, errorHandler) {
        quantimodoService.post('api/v1/variables/join/delete', [], variableJoinData, successHandler, errorHandler);
    };
    quantimodoService.deleteUserTagDeferred = function(tagData) {
        var deferred = $q.defer();
        quantimodoService.deleteUserTag(tagData, function(response){
            quantimodoService.addVariableToLocalStorage(response.data.userTaggedVariable);
            quantimodoService.addVariableToLocalStorage(response.data.userTagVariable);
            deferred.resolve(response);
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.deleteUserTag = function(userTagData, successHandler, errorHandler) {
        quantimodoService.post('api/v1/userTags/delete', [], userTagData, successHandler, errorHandler);
    };
    quantimodoService.getUserTagsDeferred = function() {
        var deferred = $q.defer();
        quantimodoService.getUserTags.then(function (userTags) {deferred.resolve(userTags);});
        return deferred.promise;
    };
    quantimodoService.getUserTags = function(params, successHandler, errorHandler){
        quantimodoService.get('api/v1/userTags', ['variableCategoryName', 'id'], params, successHandler, errorHandler);
    };
    quantimodoService.updateUserTimeZoneIfNecessary = function () {
        var d = new Date();
        var timeZoneOffsetInMinutes = d.getTimezoneOffset();
        if($rootScope.user && $rootScope.user.timeZoneOffset !== timeZoneOffsetInMinutes ){
            var params = {timeZoneOffset: timeZoneOffsetInMinutes};
            quantimodoService.updateUserSettingsDeferred(params);
        }
    };
    quantimodoService.postDeviceToken = function(deviceToken, successHandler, errorHandler) {
        var platform;
        if($rootScope.isAndroid){platform = 'android';}
        if($rootScope.isIOS){platform = 'ios';}
        if($rootScope.isWindows){platform = 'windows';}
        var params = {platform: platform, deviceToken: deviceToken, clientId: quantimodoService.getClientId()};
        quantimodoService.post('api/v1/deviceTokens', ['deviceToken', 'platform'], params, successHandler, errorHandler);
    };
    quantimodoService.deleteDeviceTokenFromServer = function(successHandler, errorHandler) {
        var deferred = $q.defer();
        if(!localStorage.getItem('deviceTokenOnServer')){
            deferred.reject('No deviceToken provided to quantimodoService.deleteDeviceTokenFromServer');
        } else {
            var params = {deviceToken: localStorage.getItem('deviceTokenOnServer')};
            quantimodoService.post('api/v1/deviceTokens/delete',
                ['deviceToken'],
                params,
                successHandler,
                errorHandler);
            localStorage.removeItem('deviceTokenOnServer');
            deferred.resolve();
        }
        return deferred.promise;
    };
    // delete tracking reminder
    quantimodoService.deleteTrackingReminder = function(reminderId, successHandler, errorHandler){
        if(!reminderId){
            console.error('No reminder id to delete with!  Maybe it has only been stored locally and has not updated from server yet.');
            return;
        }
        quantimodoService.post('api/v1/trackingReminders/delete',
            ['id'],
            {id: reminderId},
            successHandler,
            errorHandler);
    };
    // snooze tracking reminder
    quantimodoService.snoozeTrackingReminderNotification = function(params, successHandler, errorHandler){
        quantimodoService.post('api/v1/trackingReminderNotifications/snooze',
            ['id', 'trackingReminderNotificationId', 'trackingReminderId'],
            params,
            successHandler,
            errorHandler);
    };
    // skip tracking reminder
    quantimodoService.skipTrackingReminderNotification = function(params, successHandler, errorHandler){
        quantimodoService.post('api/v1/trackingReminderNotifications/skip',
            ['id', 'trackingReminderNotificationId', 'trackingReminderId'],
            params,
            successHandler,
            errorHandler);
    };
    // skip tracking reminder
    quantimodoService.skipAllTrackingReminderNotifications = function(params, successHandler, errorHandler){
        if(!params){params = [];}
        quantimodoService.post('api/v1/trackingReminderNotifications/skip/all',
            //['trackingReminderId'],
            [],
            params,
            successHandler,
            errorHandler);
    };
    quantimodoService.getAccessTokenFromCurrentUrl = function(){
        return (quantimodoService.getUrlParameter('accessToken')) ? quantimodoService.getUrlParameter('accessToken') : quantimodoService.getUrlParameter('quantimodoAccessToken');
    };
    quantimodoService.getAccessTokenFromUrl = function(){
        if(!$rootScope.accessTokenFromUrl){
            $rootScope.accessTokenFromUrl = quantimodoService.getAccessTokenFromCurrentUrl();
            if($rootScope.accessTokenFromUrl){
                quantimodoService.setLocalStorageItem('onboarded', true);
                quantimodoService.setLocalStorageItem('introSeen', true);
            }
        }
        return $rootScope.accessTokenFromUrl;
    };
    function isTestUser(){return $rootScope.user && $rootScope.user.displayName.indexOf('test') !== -1 && $rootScope.user.id !== 230;}
    function weHaveUserOrAccessToken(){return $rootScope.user || quantimodoService.getAccessTokenFromUrl();};
    quantimodoService.refreshUserUsingAccessTokenInUrlIfNecessary = function(){
        if($rootScope.user && $rootScope.user.accessToken === quantimodoService.getAccessTokenFromUrl()){return;}
        if(quantimodoService.getAccessTokenFromUrl()){
            var accessTokenFromLocalStorage = localStorage.getItem("accessToken");
            if(accessTokenFromLocalStorage && $rootScope.accessTokenFromUrl !== accessTokenFromLocalStorage){quantimodoService.clearLocalStorage();}
            var user = JSON.parse(localStorage.getItem('user'));
            if(!user && $rootScope.user){user = $rootScope.user;}
            if(user && $rootScope.accessTokenFromUrl !== user.accessToken){
                $rootScope.user = null;
                quantimodoService.clearLocalStorage();
            }
            if(!quantimodoService.getUrlParameter('doNotRemember')){localStorage.setItem('accessToken', $rootScope.accessTokenFromUrl);}
            if(!$rootScope.user){quantimodoService.refreshUser();}
        }
    };
    quantimodoService.getAccessTokenFromAnySource = function () {
        var deferred = $q.defer();
         if(quantimodoService.getAccessTokenFromUrl()){
            deferred.resolve($rootScope.accessTokenFromUrl);
            return deferred.promise;
        }
        var accessTokenFromLocalStorage = localStorage.getItem("accessToken");
        var expiresAtMilliseconds = localStorage.getItem("expiresAtMilliseconds");
        var refreshToken = localStorage.getItem("refreshToken");
        //console.debug('quantimodoService.getOrRefreshAccessTokenOrLogin: Values from local storage:', JSON.stringify({expiresAtMilliseconds: expiresAtMilliseconds, refreshToken: refreshToken, accessToken: accessToken}));
        if(refreshToken && !expiresAtMilliseconds){
            var errorMessage = 'We have a refresh token but expiresAtMilliseconds is ' + expiresAtMilliseconds + '.  How did this happen?';
            if(!isTestUser()){Bugsnag.notify(errorMessage, quantimodoService.getLocalStorageItemAsString('user'), {groupingHash: errorMessage}, "error");}
        }
        if (accessTokenFromLocalStorage && getUnixTimestampInMilliseconds() < expiresAtMilliseconds) {
            //console.debug('quantimodoService.getOrRefreshAccessTokenOrLogin: Current access token should not be expired. Resolving token using one from local storage');
            deferred.resolve(accessTokenFromLocalStorage);
        } else if (refreshToken && expiresAtMilliseconds && quantimodoService.getClientId() !== 'oAuthDisabled' && window.private_keys) {
            console.debug(getUnixTimestampInMilliseconds() + ' (now) is greater than expiresAt ' + expiresAtMilliseconds);
            quantimodoService.refreshAccessToken(refreshToken, deferred);
        } else if(accessTokenFromLocalStorage){
            deferred.resolve(accessTokenFromLocalStorage);
        } else if (window.developmentMode) {
            quantimodoService.getDevCredentials().then(function(){
                deferred.resolve();
            });
        } else if(quantimodoService.getClientId() === 'oAuthDisabled' || !window.private_keys) {
            //console.debug('getAccessTokenFromAnySource: oAuthDisabled so we do not need an access token');
            deferred.resolve();
            return deferred.promise;
        } else {
            console.warn('Could not get or refresh access token at ' + window.location.href);
            deferred.resolve();
        }
        return deferred.promise;
    };
    quantimodoService.refreshAccessToken = function(refreshToken, deferred) {
        console.debug('Refresh token will be used to fetch access token from ' +
            quantimodoService.getQuantiModoUrl("api/oauth2/token") + ' with client id ' + quantimodoService.getClientId());
        var url = quantimodoService.getQuantiModoUrl("api/oauth2/token");
        $http.post(url, {
            client_id: quantimodoService.getClientId(),
            client_secret: quantimodoService.getClientSecret(),
            refresh_token: refreshToken,
            grant_type: 'refresh_token'
        }).success(function (data) {
            // update local storage
            if (data.error) {
                console.debug('Token refresh failed: ' + data.error);
                deferred.reject('Token refresh failed: ' + data.error);
            } else {
                var accessTokenRefreshed = quantimodoService.saveAccessTokenInLocalStorage(data);
                console.debug('quantimodoService.refreshAccessToken: access token successfully updated from api server: ' + JSON.stringify(data));
                deferred.resolve(accessTokenRefreshed);
            }
        }).error(function (response) {
            console.debug("quantimodoService.refreshAccessToken: failed to refresh token from api server" + JSON.stringify(response));
            deferred.reject(response);
        });

    };
    quantimodoService.saveAccessTokenInLocalStorage = function (accessResponse) {
        var accessToken = accessResponse.accessToken || accessResponse.access_token;
        if (accessToken) {
            $rootScope.accessToken = accessToken;
            localStorage.setItem('accessToken', accessToken);
        } else {
            console.error('No access token provided to quantimodoService.saveAccessTokenInLocalStorage');
            return;
        }
        var refreshToken = accessResponse.refreshToken || accessResponse.refresh_token;
        if (refreshToken) {localStorage.refreshToken = refreshToken;}
        var expiresAt = accessResponse.expires || accessResponse.expiresAt || accessResponse.accessTokenExpires;
        var expiresAtMilliseconds;
        var bufferInMilliseconds = 86400 * 1000;  // Refresh a day in advance
        if(accessResponse.accessTokenExpiresAtMilliseconds){
            expiresAtMilliseconds = accessResponse.accessTokenExpiresAtMilliseconds;
        } else if (typeof expiresAt === 'string' || expiresAt instanceof String){
            expiresAtMilliseconds = getUnixTimestampInMilliseconds(expiresAt);
        } else if (expiresAt === parseInt(expiresAt, 10) && expiresAt < getUnixTimestampInMilliseconds()) {
            expiresAtMilliseconds = expiresAt * 1000;
        } else if(expiresAt === parseInt(expiresAt, 10) && expiresAt > getUnixTimestampInMilliseconds()){
            expiresAtMilliseconds = expiresAt;
        } else {
            // calculate expires at
            var expiresInSeconds = accessResponse.expiresIn || accessResponse.expires_in;
            expiresAtMilliseconds = getUnixTimestampInMilliseconds() + expiresInSeconds * 1000;
            console.debug("Expires in is " + expiresInSeconds + ' seconds. This results in expiresAtMilliseconds being: ' + expiresAtMilliseconds);
        }
        if(expiresAtMilliseconds){
            localStorage.expiresAtMilliseconds = expiresAtMilliseconds - bufferInMilliseconds;
            return accessToken;
        } else {
            console.error('No expiresAtMilliseconds!');
            Bugsnag.notify('No expiresAtMilliseconds!',
                'expiresAt is ' + expiresAt + ' || accessResponse is ' + JSON.stringify(accessResponse) + ' and user is ' + quantimodoService.getLocalStorageItemAsString('user'),
                {groupingHash: 'No expiresAtMilliseconds!'},
                "error");
        }
        var groupingHash = 'Access token expiresAt not provided in recognizable form!';
        console.error(groupingHash);
        Bugsnag.notify(groupingHash,
            'expiresAt is ' + expiresAt + ' || accessResponse is ' + JSON.stringify(accessResponse) + ' and user is ' + quantimodoService.getLocalStorageItemAsString('user'),
            {groupingHash: groupingHash},
            "error");
    };
    quantimodoService.convertToObjectIfJsonString = function (stringOrObject) {
        try {stringOrObject = JSON.parse(stringOrObject);} catch (exception) {return stringOrObject;}
        return stringOrObject;
    };
    quantimodoService.generateV1OAuthUrl = function(register) {
        var url = quantimodoService.getApiUrl() + "/api/oauth2/authorize?";
        // add params
        url += "response_type=code";
        url += "&client_id=" + quantimodoService.getClientId();
        url += "&client_secret=" + quantimodoService.getClientSecret();
        url += "&scope=" + quantimodoService.getPermissionString();
        url += "&state=testabcd";
        if(register === true){url += "&register=true";}
        //url += "&redirect_uri=" + quantimodoService.getRedirectUri();
        console.debug("generateV1OAuthUrl: " + url);
        return url;
    };
    quantimodoService.generateV2OAuthUrl= function(JWTToken) {
        var url = quantimodoService.getQuantiModoUrl("api/v2/bshaffer/oauth/authorize", true);
        url += "response_type=code";
        url += "&client_id=" + quantimodoService.getClientId();
        url += "&client_secret=" + quantimodoService.getClientSecret();
        url += "&scope=" + quantimodoService.getPermissionString();
        url += "&state=testabcd";
        if(JWTToken){url += "&token=" + JWTToken;}
        //url += "&redirect_uri=" + quantimodoService.getRedirectUri();
        console.debug("generateV2OAuthUrl: " + url);
        return url;
    };
    quantimodoService.getAuthorizationCodeFromUrl = function(event) {
        console.debug('extracting authorization code from event: ' + JSON.stringify(event));
        var authorizationUrl = event.url;
        if(!authorizationUrl) {authorizationUrl = event.data;}
        var authorizationCode = quantimodoService.getUrlParameter('code', authorizationUrl);
        if(!authorizationCode) {authorizationCode = quantimodoService.getUrlParameter('token', authorizationUrl);}
        return authorizationCode;
    };
    quantimodoService.getAccessTokenFromAuthorizationCode = function (authorizationCode) {
        console.debug("Authorization code is " + authorizationCode);
        var deferred = $q.defer();
        var url = quantimodoService.getQuantiModoUrl("api/oauth2/token");
        var request = {
            method: 'POST',
            url: url,
            responseType: 'json',
            headers: {
                'Content-Type': "application/json"
            },
            data: {
                client_id: quantimodoService.getClientId(),
                client_secret: quantimodoService.getClientSecret(),
                grant_type: 'authorization_code',
                code: authorizationCode,
                redirect_uri: quantimodoService.getRedirectUri()
            }
        };
        console.debug('getAccessTokenFromAuthorizationCode: request is ', request);
        console.debug(JSON.stringify(request));
        // post
        $http(request).success(function (response) {
            if(response.error){
                quantimodoService.reportErrorDeferred(response);
                alert(response.error + ": " + response.error_description + ".  Please try again or contact mike@quantimo.do.");
                deferred.reject(response);
            } else {
                console.debug('getAccessTokenFromAuthorizationCode: Successful response is ', response);
                console.debug(JSON.stringify(response));
                deferred.resolve(response);
            }
        }).error(function (response) {
            console.debug('getAccessTokenFromAuthorizationCode: Error response is ', response);
            console.debug(JSON.stringify(response));
            deferred.reject(response);
        });
        return deferred.promise;
    };
    quantimodoService.getTokensAndUserViaNativeGoogleLogin = function (body) {
        var deferred = $q.defer();
        var path = 'api/v1/googleIdToken';
        quantimodoService.post(path, [], body, function (response) {
            deferred.resolve(response);
        }, function (error) {
            if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.getTokensAndUserViaNativeSocialLogin = function (provider, accessToken) {
        var deferred = $q.defer();
        if(!accessToken || accessToken === "null"){
            quantimodoService.reportErrorDeferred("accessToken not provided to getTokensAndUserViaNativeSocialLogin function");
            deferred.reject("accessToken not provided to getTokensAndUserViaNativeSocialLogin function");
        }
        var url = quantimodoService.getQuantiModoUrl('api/v2/auth/social/authorizeToken');
        url += "provider=" + encodeURIComponent(provider);
        url += "&accessToken=" + encodeURIComponent(accessToken);
        url += "&client_id=" + encodeURIComponent(quantimodoService.getClientId());
        console.debug('quantimodoService.getTokensAndUserViaNativeSocialLogin about to make request to ' + url);
        $http({
            method: 'GET',
            url: url,
            headers: {'Content-Type': 'application/json'}
        }).then(function (response) {
            if (response.data.success && response.data.data && response.data.data.token) {
                // This didn't solve the token_invalid issue
                // $timeout(function () {
                //     console.debug('10 second delay to try to solve token_invalid issue');
                //  deferred.resolve(response.data.data.token);
                // }, 10000);
                deferred.resolve(response.data.data);
            } else {deferred.reject(response);}
        }, function (error) {
            if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.registerDeviceToken = function(){
        var deferred = $q.defer();
        if(!$rootScope.isMobile){
            deferred.reject('Not on mobile so not posting device token');
            return deferred.promise;
        }
        var deviceTokenToSync = localStorage.getItem('deviceTokenToSync');
        if(!deviceTokenToSync){
            deferred.reject('No deviceTokenToSync in localStorage');
            return deferred.promise;
        }
        localStorage.removeItem('deviceTokenToSync');
        console.debug("Posting deviceToken to server: ", deviceTokenToSync);
        quantimodoService.postDeviceToken(deviceTokenToSync, function(response){
            localStorage.setItem('deviceTokenOnServer', deviceTokenToSync);
            console.debug(response);
            deferred.resolve();
        }, function(error){
            localStorage.setItem('deviceTokenToSync', deviceTokenToSync);
            if (typeof Bugsnag !== "undefined") {Bugsnag.notify(error, JSON.stringify(error), {}, "error");}
            deferred.reject(error);
        });
        return deferred.promise;
    };

    var setupGoogleAnalytics = function(user){
        if(config.appSettings.additionalSettings && config.appSettings.additionalSettings.googleAnalyticsTrackingIds){
            if(typeof analytics !== "undefined") {analytics.startTrackerWithId(config.appSettings.additionalSettings.googleAnalyticsTrackingIds.ionic);}
        } else {
            console.error("No config.appSettings.additionalSettings.googleAnalyticsTrackingIds.ionic!");
        }
        Analytics.registerScriptTags();
        Analytics.registerTrackers();
        // you can set any advanced configuration here
        Analytics.set('&uid', user.id);
        Analytics.set('&ds', $rootScope.currentPlatform);
        Analytics.set('&cn', config.appSettings.appDisplayName);
        Analytics.set('&cs', config.appSettings.appDisplayName);
        Analytics.set('&cm', $rootScope.currentPlatform);
        Analytics.set('&an', config.appSettings.appDisplayName);
        if(config.appSettings.additionalSettings && config.appSettings.additionalSettings.appIds && config.appSettings.additionalSettings.appIds.googleReversedClientId){
            Analytics.set('&aid', config.appSettings.additionalSettings.appIds.googleReversedClientId);
        }
        Analytics.set('&av', config.appSettings.versionNumber);
        // Register a custom dimension for the default, unnamed account object
        // e.g., ga('set', 'dimension1', 'Paid');
        Analytics.set('dimension1', 'Paid');
        Analytics.set('dimension2', user.id.toString());
        // Register a custom dimension for a named account object
        // e.g., ga('accountName.set', 'dimension2', 'Paid');
        //Analytics.set('dimension2', 'Paid', 'accountName');
        Analytics.pageView(); // send data to Google Analytics
        //console.debug('Just set up Google Analytics');
    };
    quantimodoService.getUserAndSetupGoogleAnalytics = function(){
        if(Analytics){
            if($rootScope.user){
                setupGoogleAnalytics($rootScope.user);
                return;
            }
            quantimodoService.getLocalStorageItemAsStringWithCallback('user', function (userString) {
                if(userString){
                    var user = JSON.parse(userString);
                    setupGoogleAnalytics(user);
                }
            });
        }
    };
    quantimodoService.setUserInLocalStorageBugsnagIntercomPush = function(user){
        $rootScope.user = user;
        if(quantimodoService.getUrlParameter('doNotRemember')){return;}
        quantimodoService.setLocalStorageItem('user', JSON.stringify(user));
        localStorage.user = JSON.stringify(user); // For Chrome Extension
        quantimodoService.saveAccessTokenInLocalStorage(user);
        quantimodoService.backgroundGeolocationInit();
        quantimodoService.setupBugsnag();
        quantimodoService.getUserAndSetupGoogleAnalytics();
        if (typeof UserVoice !== "undefined") {
            UserVoice.push(['identify', {
                email: user.email, // User’s email address
                name: user.displayName, // User’s real name
                created_at: getUnixTimestampInSeconds(user.userRegistered), // Unix timestamp for the date the user signed up
                id: user.id, // Optional: Unique id of the user (if set, this should not change)
                type: getSourceName() + ' User (Subscribed: ' + user.subscribed + ')', // Optional: segment your users by type
                account: {
                    //id: 123, // Optional: associate multiple users with a single account
                    name: getSourceName() + ' v' + config.appSettings.versionNumber, // Account name
                    //created_at: 1364406966, // Unix timestamp for the date the account was created
                    //monthly_rate: 9.99, // Decimal; monthly rate of the account
                    //ltv: 1495.00, // Decimal; lifetime value of the account
                    //plan: 'Subscribed' // Plan name for the account
                }
            }]);
        }

/*            Don't need Intercom
        window.intercomSettings = {
            app_id: "uwtx2m33",
            name: user.displayName,
            email: user.email,
            user_id: user.id,
            app_name: config.appSettings.appDisplayName,
            app_version: config.appSettings.versionNumber,
            platform: $rootScope.currentPlatform
        };
        */

        if(localStorage.getItem('deviceTokenOnServer')){console.debug("This token is already on the server: " + localStorage.getItem('deviceTokenOnServer'));}
        quantimodoService.registerDeviceToken();
        if($rootScope.sendReminderNotificationEmails){
            quantimodoService.updateUserSettingsDeferred({sendReminderNotificationEmails: $rootScope.sendReminderNotificationEmails});
            $rootScope.sendReminderNotificationEmails = null;
        }
        quantimodoService.afterLoginGoToUrlOrState();
        quantimodoService.updateUserTimeZoneIfNecessary();
    };
    quantimodoService.goToDefaultStateIfNoAfterLoginUrlOrState = function () {
        if(!quantimodoService.afterLoginGoToUrlOrState()){$state.go(config.appSettings.appDesign.defaultState);}
    };
    quantimodoService.afterLoginGoToUrlOrState = function () {
        var afterLoginGoTo = quantimodoService.getLocalStorageItemAsString('afterLoginGoTo');
        //console.debug("afterLoginGoTo from localstorage is  " + afterLoginGoTo);
        if(afterLoginGoTo) {
            quantimodoService.deleteItemFromLocalStorage('afterLoginGoTo');
            window.location.replace(afterLoginGoTo);
            return true;
        }
        var afterLoginGoToState = quantimodoService.getLocalStorageItemAsString('afterLoginGoToState');
        //console.debug("afterLoginGoToState from localstorage is  " + afterLoginGoToState);
        if(afterLoginGoToState){
            quantimodoService.deleteItemFromLocalStorage('afterLoginGoToState');
            $state.go(afterLoginGoToState);
            return true;
        }
        if($state.current.name === 'app.login'){
            $state.go(config.appSettings.appDesign.defaultState);
            return true;
        }
        return false;
    };
    quantimodoService.syncAllUserData = function(){
        quantimodoService.syncTrackingReminders();
        quantimodoService.getUserVariablesFromLocalStorageOrApiDeferred();
    };
    quantimodoService.refreshUser = function(){
        var deferred = $q.defer();
        if(quantimodoService.getUrlParameter('logout')){
            console.debug('Not refreshing user because we have a logout parameter');
            deferred.reject('Not refreshing user because we have a logout parameter');
            return deferred.promise;
        }
        quantimodoService.getUserFromApi(function(user){
            quantimodoService.setUserInLocalStorageBugsnagIntercomPush(user);
            deferred.resolve(user);
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.sendToNonOAuthBrowserLoginUrl = function(register) {
        var loginUrl = quantimodoService.getQuantiModoUrl("api/v2/auth/login");
        if (register === true) {loginUrl = quantimodoService.getQuantiModoUrl("api/v2/auth/register");}
        console.debug('sendToNonOAuthBrowserLoginUrl: AUTH redirect URL created:', loginUrl);
        var apiUrlMatchesHostName = quantimodoService.getApiUrl().indexOf(window.location.hostname);
        if(apiUrlMatchesHostName > -1 || $rootScope.isChromeExtension) {
            quantimodoService.showBlackRingLoader();
            loginUrl += "?redirect_uri=" + encodeURIComponent(window.location.href + '?loggingIn=true');
            // Have to come back to login page and wait for user request to complete
            window.location.replace(loginUrl);
        } else {
            alert("API url doesn't match auth base url.  Please make use the same domain in config file");
        }
    };
    quantimodoService.refreshUserEmailPreferencesDeferred = function(params){
        var deferred = $q.defer();
        quantimodoService.getUserEmailPreferences(params, function(user){deferred.resolve(user);}, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.completelyResetAppState = function(){
        $rootScope.user = null;
        // Getting token so we can post as the new user if they log in again
        quantimodoService.deleteDeviceTokenFromServer();
        quantimodoService.clearLocalStorage();
        quantimodoService.cancelAllNotifications();
        $ionicHistory.clearHistory();
        $ionicHistory.clearCache();
    };
    quantimodoService.clearOAuthTokensFromLocalStorage = function(){
        localStorage.setItem('accessToken', null);
        localStorage.setItem('refreshToken', null);
        localStorage.setItem('expiresAtMilliseconds', null);
    };
    quantimodoService.updateUserSettingsDeferred = function(params){
        var deferred = $q.defer();
        quantimodoService.postUserSettings(params, function(response){
            if(!params.userEmail) {
                quantimodoService.refreshUser().then(function(user){
                    console.debug('updateUserSettingsDeferred got this user: ' + JSON.stringify(user));
                }, function(error){
                    console.error('quantimodoService.updateUserSettingsDeferred could not refresh user because ' + JSON.stringify(error));
                });
            }
            deferred.resolve(response);
        }, function(response){deferred.reject(response);});
        return deferred.promise;
    };
    quantimodoService.filterByStringProperty = function(arrayToFilter, propertyName, allowedValue){
        if(!allowedValue || allowedValue.toLowerCase() === "anything"){ return arrayToFilter; }
        var filteredArray = [];
        for(var i = 0; i < arrayToFilter.length; i++){
            if(arrayToFilter[i][propertyName].toLowerCase() === allowedValue.toLowerCase()){filteredArray.push(arrayToFilter[i]);}
        }
        return filteredArray;
    };
    quantimodoService.getFavoriteTrackingRemindersFromLocalStorage = function(variableCategoryName){
        var deferred = $q.defer();
        quantimodoService.getAllReminderTypes(variableCategoryName).then(function (allTrackingReminderTypes) {
            deferred.resolve(allTrackingReminderTypes.favorites);
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.getTruncatedVariableName = function(variableName) {if(variableName.length > 18){return variableName.substring(0, 18) + '...';} else { return variableName;}};
    quantimodoService.variableObjectActionSheet = function() {
        console.debug("variablePageCtrl.showActionSheetMenu:  $rootScope.variableObject: ", $rootScope.variableObject);
        var hideSheet = $ionicActionSheet.show({
            buttons: [
                quantimodoService.actionSheetButtons.recordMeasurement,
                quantimodoService.actionSheetButtons.addReminder,
                quantimodoService.actionSheetButtons.history,
                quantimodoService.actionSheetButtons.analysisSettings,
            ],
            destructiveText: '<i class="icon ion-trash-a"></i>Delete All',
            cancelText: '<i class="icon ion-ios-close"></i>Cancel',
            cancel: function() {console.debug('CANCELLED');},
            buttonClicked: function(index) {
                console.debug('BUTTON CLICKED', index);
                if(index === 0){$state.go('app.measurementAddVariable', {variableObject: $rootScope.variableObject, variableName: $rootScope.variableObject.name});} // Need variable name to populate in url
                if(index === 1){$state.go('app.reminderAdd', {variableObject: $rootScope.variableObject, variableName: $rootScope.variableObject.name});} // Need variable name to populate in url
                if(index === 2) {$state.go('app.historyAllVariable', {variableObject: $rootScope.variableObject, variableName: $rootScope.variableObject.name});} // Need variable name to populate in url
                if(index === 3) {$state.go('app.variableSettings', {variableObject: $rootScope.variableObject, variableName: $rootScope.variableObject.name});} // Need variable name to populate in url
                return true;
            },
            destructiveButtonClicked: function() {
                quantimodoService.showDeleteAllMeasurementsForVariablePopup($rootScope.variableObject);
                return true;
            }
        });
        $timeout(function() {hideSheet();}, 20000);
    };
    quantimodoService.attachVariableCategoryIcons = function(dataArray){
        if(!dataArray){ return;}
        var variableCategoryInfo;
        for(var i = 0; i < dataArray.length; i++){
            variableCategoryInfo = quantimodoService.getVariableCategoryInfo(dataArray[i].variableCategoryName);
            if(variableCategoryInfo.ionIcon){
                if(!dataArray[i].ionIcon){ dataArray[i].ionIcon = variableCategoryInfo.ionIcon;}
            } else {
                console.warn('Could not find icon for variableCategoryName ' + dataArray[i].variableCategoryName);
                return 'ion-speedometer';
            }
        }
        return dataArray;
    };
    quantimodoService.getVariableCategoryInfo = function (variableCategoryName) {
        var selectedVariableCategoryObject = $rootScope.variableCategories.Anything;
        if(variableCategoryName && $rootScope.variableCategories[variableCategoryName]){
            selectedVariableCategoryObject =  $rootScope.variableCategories[variableCategoryName];
        }
        return selectedVariableCategoryObject;
    };
    quantimodoService.getStudyDeferred = function (params){
        var deferred = $q.defer();
        if(quantimodoService.getUrlParameter('aggregated')){params.aggregated = true;}
        quantimodoService.getStudy(params, function (response) {
            var study;
            if(response.userStudy){ study = response.userStudy; }
            if(response.publicStudy){ study = response.publicStudy; }
            if(study.charts){
                study.charts = Object.keys(study.charts).map(function (key) { return study.charts[key]; });
                for(var i=0; i < study.charts.length; i++){
                    study.charts[i].chartConfig = setChartExportingOptions(study.charts[i].chartConfig);
                }
            }
            localStorage.setItem('lastStudy', JSON.stringify(study));
            deferred.resolve(study);
        }, function (error) {
            deferred.reject(error);
            console.error(error);
        });
        return deferred.promise;
    };
    quantimodoService.getLocalPrimaryOutcomeMeasurements = function(){
        var primaryOutcomeVariableMeasurements = quantimodoService.getLocalStorageItemAsObject('primaryOutcomeVariableMeasurements');
        if(!primaryOutcomeVariableMeasurements) {primaryOutcomeVariableMeasurements = [];}
        var measurementsQueue = getPrimaryOutcomeMeasurementsFromQueue();
        if(measurementsQueue){primaryOutcomeVariableMeasurements = primaryOutcomeVariableMeasurements.concat(measurementsQueue);}
        primaryOutcomeVariableMeasurements = primaryOutcomeVariableMeasurements.sort(function(a,b){
            if(a.startTimeEpoch < b.startTimeEpoch){return 1;}
            if(a.startTimeEpoch> b.startTimeEpoch){return -1;}
            return 0;
        });
        return quantimodoService.addInfoAndImagesToMeasurements(primaryOutcomeVariableMeasurements);
    };
    function getPrimaryOutcomeMeasurementsFromQueue() {
        var measurementsQueue = quantimodoService.getLocalStorageItemAsObject('measurementsQueue');
        var primaryOutcomeMeasurements = [];
        if(measurementsQueue){
            for(var i = 0; i < measurementsQueue.length; i++){
                if(measurementsQueue[i].variableName === quantimodoService.getPrimaryOutcomeVariable().name){
                    primaryOutcomeMeasurements.push(measurementsQueue[i]);
                }
            }
        }
        return primaryOutcomeMeasurements;
    }
    function canWeSyncYet(localStorageItemName, minimumSecondsBetweenSyncs){
        if(getUnixTimestampInSeconds() - localStorage.getItem(localStorageItemName) < minimumSecondsBetweenSyncs) {
            var errorMessage = 'Cannot sync because already did within the last ' + minimumSecondsBetweenSyncs + ' seconds';
            console.error(errorMessage);
            return false;
        }
        localStorage.setItem(localStorageItemName, getUnixTimestampInSeconds());
        return true;
    }
    quantimodoService.getAndStorePrimaryOutcomeMeasurements = function(){
        var deferred = $q.defer();
        var errorMessage;
        if(!weHaveUserOrAccessToken()){
            errorMessage = 'Cannot sync because we do not have a user or access token in url';
            console.error(errorMessage);
            deferred.reject(errorMessage);
            return deferred.promise;
        }
        var params = {variableName : quantimodoService.getPrimaryOutcomeVariable().name, sort : '-startTimeEpoch', limit:900};
        quantimodoService.getMeasurementsFromApi(params, function(primaryOutcomeMeasurementsFromApi){
            if (primaryOutcomeMeasurementsFromApi.length > 0) {
                quantimodoService.setLocalStorageItem('primaryOutcomeVariableMeasurements', JSON.stringify(primaryOutcomeMeasurementsFromApi));
                $rootScope.$broadcast('updateCharts');
            }
            deferred.resolve(primaryOutcomeMeasurementsFromApi);
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    function getUnixTimestampInSeconds(dateTimeString) {
        return Math.round(getUnixTimestampInMilliseconds(dateTimeString)/1000);
    }
    function getUnixTimestampInMilliseconds(dateTimeString) {
        if(!dateTimeString){return new Date().getTime();}
        return new Date(dateTimeString).getTime();
    }
    function checkIfStartTimeEpochIsWithinTheLastYear(startTimeEpoch) {
        var result = startTimeEpoch > getUnixTimestampInSeconds() - 365 * 86400;
        if(!result){
            var errorName = 'startTimeEpoch is earlier than last year';
            var errorMessage = startTimeEpoch + ' ' + errorName;
            Bugsnag.notify(errorName, errorMessage, {startTimeEpoch :startTimeEpoch}, "error");
            console.error(errorMessage);
        }
        return startTimeEpoch;
    }
    quantimodoService.postMeasurementQueueToServer = function(successHandler, errorHandler){
        var defer = $q.defer();
        if(!weHaveUserOrAccessToken()){
            var errorMessage = 'Not doing syncPrimaryOutcomeVariableMeasurements because we do not have a $rootScope.user or access token in url';
            console.error(errorMessage);
            defer.reject(errorMessage);
            return defer.promise;
        }
        quantimodoService.getLocalStorageItemAsStringWithCallback('measurementsQueue', function(measurementsQueueString) {
            var parsedMeasurementsQueue = JSON.parse(measurementsQueueString);
            if(!parsedMeasurementsQueue || parsedMeasurementsQueue.length < 1){
                if(successHandler){successHandler();}
                return;
            }
            quantimodoService.postMeasurementsToApi(parsedMeasurementsQueue, function (response) {
                if(response && response.data && response.data.userVariables){
                    quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('userVariables', response.data.userVariables);
                }
                quantimodoService.setLocalStorageItem('measurementsQueue', JSON.stringify([]));
                if(successHandler){successHandler();}
                defer.resolve();
            }, function (error) {
                quantimodoService.setLocalStorageItem('measurementsQueue', measurementsQueueString);
                if(errorHandler){errorHandler();}
                defer.reject(error);
            });
        });
        return defer.promise;
    };
    quantimodoService.syncPrimaryOutcomeVariableMeasurements = function(){
        var defer = $q.defer();
        if(!weHaveUserOrAccessToken()){
            console.debug('Not doing syncPrimaryOutcomeVariableMeasurements because we do not have a $rootScope.user');
            defer.resolve();
            return defer.promise;
        }
        var minimumSecondsBetweenGets = 10;
        if(!canWeSyncYet("lastMeasurementSyncTime", minimumSecondsBetweenGets)){
            defer.reject('Cannot sync because already did within the last ' + minimumSecondsBetweenGets + ' seconds');
            return defer.promise;
        }
        quantimodoService.postMeasurementQueueToServer(function(){
            quantimodoService.getAndStorePrimaryOutcomeMeasurements().then(function(primaryOutcomeMeasurementsFromApi){
                defer.resolve(primaryOutcomeMeasurementsFromApi);
            }, function(error){defer.reject(error);});
        });
        return defer.promise;
    };

    // date setter from - to
    quantimodoService.setDates = function(to, from){
        var oldFromDate = quantimodoService.getLocalStorageItemAsString('fromDate');
        var oldToDate = quantimodoService.getLocalStorageItemAsString('toDate');
        quantimodoService.setLocalStorageItem('fromDate',parseInt(from));
        quantimodoService.setLocalStorageItem('toDate',parseInt(to));
        // if date range changed, update charts
        if (parseInt(oldFromDate) !== parseInt(from) || parseInt(oldToDate) !== parseInt(to)) {
            console.debug("setDates broadcasting to update charts");
            $rootScope.$broadcast('updateCharts');
            $rootScope.$broadcast('updatePrimaryOutcomeHistory');
        }
    };
    // retrieve date to end on
    quantimodoService.getToDate = function(callback){
        quantimodoService.getLocalStorageItemAsStringWithCallback('toDate',function(toDate){
            if(toDate){callback(parseInt(toDate));} else {callback(parseInt(Date.now()));}
        });
    };
    // retrieve date to start from
    quantimodoService.getFromDate = function(callback){
        quantimodoService.getLocalStorageItemAsStringWithCallback('fromDate',function(fromDate){
            if(fromDate){callback(parseInt(fromDate));
            } else {
                var date = new Date();
                // Threshold 20 Days if not provided
                date.setDate(date.getDate()-20);
                console.debug("The date returned is ", date.toString());
                callback(parseInt(date.getTime()));
            }
        });
    };
    quantimodoService.createPrimaryOutcomeMeasurement = function(numericRatingValue) {
        // if val is string (needs conversion)
        if(isNaN(parseFloat(numericRatingValue))){
            numericRatingValue = quantimodoService.getPrimaryOutcomeVariable().ratingTextToValueConversionDataSet[numericRatingValue] ?
                quantimodoService.getPrimaryOutcomeVariable().ratingTextToValueConversionDataSet[numericRatingValue] : false;
        }
        var measurementObject = {
            id: null,
            variable: quantimodoService.getPrimaryOutcomeVariable().name,
            variableName: quantimodoService.getPrimaryOutcomeVariable().name,
            variableCategoryName: quantimodoService.getPrimaryOutcomeVariable().variableCategoryName,
            valence: quantimodoService.getPrimaryOutcomeVariable().valence,
            startTimeEpoch: getUnixTimestampInSeconds(),
            unitAbbreviatedName: quantimodoService.getPrimaryOutcomeVariable().unitAbbreviatedName,
            value: numericRatingValue,
            note: null
        };
        measurementObject = addLocationAndSourceDataToMeasurement(measurementObject);
        return measurementObject;
    };
    function getSourceName() {return config.appSettings.appDisplayName + " for " + $rootScope.currentPlatform;}
    var addLocationAndSourceDataToMeasurement = function(measurementObject){
        addLocationDataToMeasurement(measurementObject);
        if(!measurementObject.sourceName){measurementObject.sourceName = getSourceName();}
        return measurementObject;
    };
    function addLocationDataToMeasurement(measurementObject) {
        if(!measurementObject.latitude){measurementObject.latitude = localStorage.getItem('lastLatitude');}
        if(!measurementObject.longitude){measurementObject.latitude = localStorage.getItem('lastLongitude');}
        if(!measurementObject.location){measurementObject.latitude = localStorage.lastLocationNameAndAddress;}
        return measurementObject;
    }
    // used when adding a new measurement from record measurement OR updating a measurement through the queue
    quantimodoService.addToMeasurementsQueue = function(measurementObject){
        measurementObject = addLocationAndSourceDataToMeasurement(measurementObject);
        quantimodoService.addToLocalStorage('measurementsQueue', measurementObject);
    };
    function removeArrayElementsWithSameId(localStorageItem, elementToAdd) {
        if(elementToAdd.id){
            localStorageItem = localStorageItem.filter(function( obj ) {
                return obj.id !== elementToAdd.id;
            });
        }
        return localStorageItem;
    }
    function removeArrayElementsWithVariableNameAndStartTime(localStorageItem, elementToAdd) {
        if(elementToAdd.startTimeEpoch && elementToAdd.variableName){
            localStorageItem = localStorageItem.filter(function( obj ) {
                return !(obj.startTimeEpoch === elementToAdd.startTimeEpoch && obj.variableName === elementToAdd.variableName);
            });
        }
        return localStorageItem;
    }
    quantimodoService.addToLocalStorage = function(localStorageItemName, elementToAdd){
        quantimodoService.getLocalStorageItemAsStringWithCallback(localStorageItemName, function(localStorageItem) {
            localStorageItem = localStorageItem ? JSON.parse(localStorageItem) : [];
            localStorageItem = removeArrayElementsWithSameId(localStorageItem, elementToAdd);
            localStorageItem = removeArrayElementsWithVariableNameAndStartTime(localStorageItem, elementToAdd);
            localStorageItem.push(elementToAdd);
            quantimodoService.setLocalStorageItem(localStorageItemName, JSON.stringify(localStorageItem));
        });
    };
    // post a single measurement
    function updateMeasurementInQueue(measurementInfo) {
        var found = false;
        quantimodoService.getLocalStorageItemAsObject('measurementsQueue', function (measurementsQueue) {
            var i = 0;
            while (!found && i < measurementsQueue.length) {
                if (measurementsQueue[i].startTimeEpoch === measurementInfo.prevStartTimeEpoch) {
                    found = true;
                    measurementsQueue[i].startTimeEpoch = measurementInfo.startTimeEpoch;
                    measurementsQueue[i].value = measurementInfo.value;
                    measurementsQueue[i].note = measurementInfo.note;
                }
            }
            quantimodoService.setLocalStorageItem('measurementsQueue', JSON.stringify(measurementsQueue));
        });
    }
    function isStartTimeInMilliseconds(measurementInfo){
        var oneWeekInFuture = getUnixTimestampInSeconds() + 7 * 86400;
        if(measurementInfo.startTimeEpoch > oneWeekInFuture){
            measurementInfo.startTimeEpoch = measurementInfo.startTimeEpoch / 1000;
            console.warn('Assuming startTime is in milliseconds since it is more than 1 week in the future');
            return true;
        }
        return false;
    }
    quantimodoService.postMeasurementDeferred = function(measurementInfo){
        isStartTimeInMilliseconds(measurementInfo);
        measurementInfo = addLocationAndSourceDataToMeasurement(measurementInfo);
        if (measurementInfo.prevStartTimeEpoch) { // Primary outcome variable - update through measurementsQueue
            updateMeasurementInQueue(measurementInfo);
        } else if(measurementInfo.id) {
            quantimodoService.deleteElementOfLocalStorageItemById('primaryOutcomeVariableMeasurements', measurementInfo.id);
            quantimodoService.addToMeasurementsQueue(measurementInfo);
        } else {
            quantimodoService.addToMeasurementsQueue(measurementInfo);
        }
        if(measurementInfo.variableName === quantimodoService.getPrimaryOutcomeVariable().name){quantimodoService.syncPrimaryOutcomeVariableMeasurements();} else {quantimodoService.postMeasurementQueueToServer();}
    };
    quantimodoService.postMeasurementByReminder = function(trackingReminder, modifiedValue) {
        var value = trackingReminder.defaultValue;
        if(typeof modifiedValue !== "undefined" && modifiedValue !== null){value = modifiedValue;}
        var measurementSet = [
            {
                variableName: trackingReminder.variableName,
                sourceName: getSourceName(),
                variableCategoryName: trackingReminder.variableCategoryName,
                unitAbbreviatedName: trackingReminder.unitAbbreviatedName,
                measurements : [
                    {
                        startTimeEpoch:  getUnixTimestampInSeconds(),
                        value: value,
                        note : null
                    }
                ]
            }
        ];
        measurementSet[0].measurements[0] = addLocationDataToMeasurement(measurementSet[0].measurements[0]);
        var deferred = $q.defer();
        if(!quantimodoService.valueIsValid(trackingReminder, value)){
            deferred.reject('Value is not valid');
            return deferred.promise;
        }
        quantimodoService.postMeasurementsToApi(measurementSet, function(response){
            if(response.success) {
                console.debug("quantimodoService.postMeasurementsToApi success: " + JSON.stringify(response));
                if(response && response.data && response.data.userVariables){
                    quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('userVariables', response.data.userVariables);
                }
                deferred.resolve();
            } else {deferred.reject(response.message ? response.message.split('.')[0] : "Can't post measurement right now!");}
        });
        return deferred.promise;
    };
    quantimodoService.deleteMeasurementFromServer = function(measurement){
        var deferred = $q.defer();
        quantimodoService.deleteElementOfLocalStorageItemById('primaryOutcomeVariableMeasurements', measurement.id);
        quantimodoService.deleteElementsOfLocalStorageItemByProperty('measurementsQueue', 'startTimeEpoch', measurement.startTimeEpoch);
        quantimodoService.deleteV1Measurements(measurement, function(response){
            deferred.resolve(response);
            console.debug("deleteMeasurementFromServer success " + JSON.stringify(response));
        }, function(response){
            console.debug("deleteMeasurementFromServer error " + JSON.stringify(response));
            deferred.reject();
        });
        return deferred.promise;
    };
    quantimodoService.postBloodPressureMeasurements = function(parameters){
        var deferred = $q.defer();
        /** @namespace parameters.startTimeEpochSeconds */
        if(!parameters.startTimeEpochSeconds){parameters.startTimeEpochSeconds = getUnixTimestampInSeconds();}
        var measurementSets = [
            {
                variableId: 1874,
                sourceName: getSourceName(),
                startTimeEpoch:  checkIfStartTimeEpochIsWithinTheLastYear(parameters.startTimeEpochSeconds),
                value: parameters.systolicValue,
                note: parameters.note
            },
            {
                variableId: 5554981,
                sourceName: getSourceName(),
                startTimeEpoch:  checkIfStartTimeEpochIsWithinTheLastYear(parameters.startTimeEpochSeconds),
                value: parameters.diastolicValue,
                note: parameters.note
            }
        ];
        measurementSets[0] = addLocationDataToMeasurement(measurementSets[0]);
        measurementSets[0] = addLocationDataToMeasurement(measurementSets[0]);
        quantimodoService.postMeasurementsToApi(measurementSets, function(response){
            if(response.success) {
                if(response && response.data && response.data.userVariables){
                    quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('userVariables', response.data.userVariables);
                }
                console.debug("quantimodoService.postMeasurementsToApi success: " + JSON.stringify(response));
                deferred.resolve(response);
            } else {deferred.reject(response);}
        });
        return deferred.promise;
    };
    function addUnitsToRootScope(units) {
        $rootScope.unitObjects = units;
        var unitAbbreviatedNames = [];
        var unitsIndexedByAbbreviatedName = [];
        var nonAdvancedUnitsIndexedByAbbreviatedName = [];
        var nonAdvancedUnitObjects = [];
        var manualTrackingUnitsIndexedByAbbreviatedName = [];
        var manualTrackingUnitObjects = [];
        for (var i = 0; i < units.length; i++) {
            unitAbbreviatedNames[i] = units[i].abbreviatedName;
            unitsIndexedByAbbreviatedName[units[i].abbreviatedName] = units[i];
            if(!units[i].advanced){
                nonAdvancedUnitObjects.push(units[i]);
                nonAdvancedUnitsIndexedByAbbreviatedName[units[i].abbreviatedName] = units[i];
            }
            if(units[i].manualTracking){
                manualTrackingUnitObjects.push(units[i]);
                manualTrackingUnitsIndexedByAbbreviatedName[units[i].abbreviatedName] = units[i];
            }
        }
        var showMoreUnitsObject = {name: "Show more units", abbreviatedName: "Show more units"};
        nonAdvancedUnitObjects.push(showMoreUnitsObject);
        nonAdvancedUnitsIndexedByAbbreviatedName[showMoreUnitsObject.abbreviatedName] = showMoreUnitsObject;
        $rootScope.unitsIndexedByAbbreviatedName = unitsIndexedByAbbreviatedName;
        $rootScope.nonAdvancedUnitsIndexedByAbbreviatedName = nonAdvancedUnitsIndexedByAbbreviatedName;
        $rootScope.nonAdvancedUnitObjects = nonAdvancedUnitObjects;
        $rootScope.manualTrackingUnitsIndexedByAbbreviatedName = manualTrackingUnitsIndexedByAbbreviatedName;
        $rootScope.manualTrackingUnitObjects = manualTrackingUnitObjects;
    }
    quantimodoService.getUnits = function(){
        var deferred = $q.defer();
        $http.get('data/units.json').success(function(units) {
            addUnitsToRootScope(units);
            deferred.resolve(units);
        });
        return deferred.promise;
    };
    quantimodoService.getUnits();
    quantimodoService.variableCategories = [];
    $rootScope.variableCategories = [];
    $rootScope.variableCategoryNames = []; // Dirty hack for variableCategoryNames because $rootScope.variableCategories is not an array we can ng-repeat through in selectors
    $rootScope.variableCategories.Anything = quantimodoService.variableCategories.Anything = {
        defaultUnitAbbreviatedName: '',
        helpText: "What do you want to record?",
        variableCategoryNameSingular: "Anything",
        defaultValuePlaceholderText : "Enter most common value here...",
        defaultValueLabel : 'Value',
        addNewVariableCardText : 'Add a new variable',
        variableCategoryName : '',
        defaultValue : '',
        measurementSynonymSingularLowercase : "measurement",
        ionIcon: "ion-speedometer"};

    quantimodoService.getVariableCategories = function(){
        var deferred = $q.defer();
        $http.get('data/variableCategories.json').success(function(variableCategories) {
            angular.forEach(variableCategories, function(variableCategory, key) {
                $rootScope.variableCategories[variableCategory.name] = variableCategory;
                $rootScope.variableCategoryNames.push(variableCategory.name);
                quantimodoService.variableCategories[variableCategory.name] = variableCategory;
            });
            setupExplanations();
            deferred.resolve(variableCategories);
        });
        return deferred.promise;
    };
    quantimodoService.getVariableCategories();
    quantimodoService.getVariableCategoryIcon = function(variableCategoryName){
        var variableCategoryInfo = quantimodoService.getVariableCategoryInfo(variableCategoryName);
        if(variableCategoryInfo.ionIcon){
            return variableCategoryInfo.ionIcon;
        } else {
            console.warn('Could not find icon for variableCategoryName ' + variableCategoryName);
            return 'ion-speedometer';
        }
    };
    function getEnv(){
        var env = "production";
        if(window.location.origin.indexOf('local') !== -1){env = "development";}
        if(window.location.origin.indexOf('staging') !== -1){env = "staging";}
        if(window.location.origin.indexOf('ionic.quantimo.do') !== -1){env = "staging";}
        if($rootScope.user && $rootScope.user.email.toLowerCase().indexOf('test') !== -1){env = "testing";}
        return env;
    }
    function envIsDevelopment() {return getEnv() === 'development';}
    quantimodoService.getEnv = function(){return getEnv();};
    function getSubDomain(){return window.location.host.split('.')[0].toLowerCase();}
    quantimodoService.getClientId = function(){
        if(typeof config !== "undefined" && config.appSettings.clientId){return config.appSettings.clientId;}
        if(!window.private_keys){return getSubDomain();}
        if (window.chrome && chrome.runtime && chrome.runtime.id) {return window.private_keys.client_ids.Chrome;}
        if ($rootScope.isIOS) { return window.private_keys.client_ids.iOS;}
        if ($rootScope.isAndroid) { return window.private_keys.client_ids.Android;}
        if ($rootScope.isChromeExtension) { return window.private_keys.client_ids.Chrome;}
        if ($rootScope.isWindows) { return window.private_keys.client_ids.Windows;}
        return window.private_keys.client_ids.Web;
    };
    quantimodoService.setPlatformVariables = function () {
        //console.debug("ionic.Platform.platform() is " + ionic.Platform.platform());
        $rootScope.isWeb = window.location.href.indexOf('https://') !== -1;
        $rootScope.isWebView = ionic.Platform.isWebView();
        $rootScope.isIPad = ionic.Platform.isIPad() && !$rootScope.isWeb;
        $rootScope.isIOS = ionic.Platform.isIOS() && !$rootScope.isWeb;
        $rootScope.isAndroid = ionic.Platform.isAndroid() && !$rootScope.isWeb;
        $rootScope.isWindowsPhone = ionic.Platform.isWindowsPhone() && !$rootScope.isWeb;
        $rootScope.isChrome = window.chrome ? true : false;
        $rootScope.currentPlatform = ionic.Platform.platform();
        $rootScope.currentPlatformVersion = ionic.Platform.version();
        $rootScope.isMobile = ($rootScope.isAndroid || $rootScope.isIOS) && !$rootScope.isWeb;
        $rootScope.isWindows = window.location.href.indexOf('ms-appx') > -1;
        $rootScope.isChromeExtension = window.location.href.indexOf('chrome-extension') !== -1;
        $rootScope.localNotificationsEnabled = $rootScope.isChromeExtension;
    };
    quantimodoService.getPermissionString = function(){
        var str = "";
        var permissions = ['readmeasurements', 'writemeasurements'];
        for(var i=0; i < permissions.length; i++) {str += permissions[i] + "%20";}
        return str.replace(/%20([^%20]*)$/,'$1');
    };
    quantimodoService.getClientSecret = function(){
        if(!window.private_keys){return;}
        if (window.chrome && chrome.runtime && chrome.runtime.id) {return window.private_keys.client_secrets.Chrome;}
        if ($rootScope.isIOS) { return window.private_keys.client_secrets.iOS; }
        if ($rootScope.isAndroid) { return window.private_keys.client_secrets.Android; }
        if ($rootScope.isChromeExtension) { return window.private_keys.client_secrets.Chrome; }
        if ($rootScope.isWindows) { return window.private_keys.client_secrets.Windows; }
        return window.private_keys.client_secrets.Web;
    };
    quantimodoService.getRedirectUri = function () {
        return quantimodoService.getApiUrl() +  '/ionic/Modo/www/callback/';
    };
    quantimodoService.getProtocol = function () {
        if (typeof ionic !== "undefined") {
            var currentPlatform = ionic.Platform.platform();
            if(currentPlatform.indexOf('win') > -1){return 'ms-appx-web';}
        }
        return 'https';
    };
    quantimodoService.getApiUrl = function () {
        if(localStorage.getItem('apiUrl')){return localStorage.getItem('apiUrl');}
        if(!window.private_keys){console.error("Cannot find www/private_configs/" +  appsManager.defaultApp + ".private_config.json or it does not contain window.private_keys");}
        if(config.appSettings.clientId !== "ionic"){return "https://" + config.appSettings.clientId + ".quantimo.do";}
        return "https://app.quantimo.do";
    };
    quantimodoService.getQuantiModoUrl = function (path) {
        if(typeof path === "undefined") {path = "";}
        return quantimodoService.getApiUrl() + "/" + path;
    };
    quantimodoService.convertToObjectIfJsonString = function (stringOrObject) {
        try {stringOrObject = JSON.parse(stringOrObject);} catch (e) {return stringOrObject;}
        return stringOrObject;
    };
    // returns bool
    // if a string starts with substring
    quantimodoService.startsWith = function (fullString, search) {
        if(!fullString){
            console.error('fullString not provided to quantimodoService.startsWith');
            return false;
        }
        return fullString.slice(0, search.length) === search;
    };
    // returns bool | string
    // if search param is found: returns its value
    // returns false if not found
    quantimodoService.getUrlParameter = function (parameterName, url, shouldDecode) {
        if(!url){url = window.location.href;}
        if(parameterName.toLowerCase().indexOf('name') !== -1){shouldDecode = true;}
        if(url.split('?').length > 1){
            var queryString = url.split('?')[1];
            var parameterKeyValuePairs = queryString.split('&');
            for (var i = 0; i < parameterKeyValuePairs.length; i++) {
                var currentParameterKeyValuePair = parameterKeyValuePairs[i].split('=');
                if (currentParameterKeyValuePair[0].toCamel().toLowerCase() === parameterName.toCamel().toLowerCase()) {
                    if(typeof shouldDecode !== "undefined")  {
                        return decodeURIComponent(currentParameterKeyValuePair[1]);
                    } else {
                        return currentParameterKeyValuePair[1];
                    }
                }
            }
        }
        return null;
    };
    function getAllQueryParamsFromUrlString(url){
        if(!url){url = window.location.href;}
        var keyValuePairsObject = {};
        var array = [];
        if(url.split('?').length > 1){
            var queryString = url.split('?')[1];
            var parameterKeyValueSubstrings = queryString.split('&');
            for (var i = 0; i < parameterKeyValueSubstrings.length; i++) {
                array = parameterKeyValueSubstrings[i].split('=');
                keyValuePairsObject[array[0]] = array[1];
            }
        }
        return keyValuePairsObject;
    }
    quantimodoService.getConnectorsDeferred = function(){
        var deferred = $q.defer();
        quantimodoService.getLocalStorageItemAsStringWithCallback('connectors', function(connectors){
            if(connectors){
                connectors = JSON.parse(connectors);
                connectors = quantimodoService.hideBrokenConnectors(connectors);
                deferred.resolve(connectors);
            } else {quantimodoService.refreshConnectors().then(function(){deferred.resolve(connectors);});}
        });
        return deferred.promise;
    };
    quantimodoService.refreshConnectors = function(){
        var deferred = $q.defer();
        quantimodoService.getConnectorsFromApi(function(connectors){
            quantimodoService.setLocalStorageItem('connectors', JSON.stringify(connectors));
            connectors = quantimodoService.hideBrokenConnectors(connectors);
            deferred.resolve(connectors);
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.disconnectConnectorDeferred = function(name){
        var deferred = $q.defer();
        quantimodoService.disconnectConnectorToApi(name, function(){deferred.resolve();}, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.connectConnectorWithParamsDeferred = function(params, lowercaseConnectorName){
        var deferred = $q.defer();
        if(lowercaseConnectorName.indexOf('weather')> -1 && !params.location){
            $http.get('https://freegeoip.net/json/').success(function(data) {
                console.log(JSON.stringify(data, null, 2));
                quantimodoService.connectConnectorWithParamsToApi({location: data.ip}, lowercaseConnectorName, function(){quantimodoService.refreshConnectors();}, function(error){deferred.reject(error);});
            });
        } else {
            quantimodoService.connectConnectorWithParamsToApi(params, lowercaseConnectorName, function(){quantimodoService.refreshConnectors();}, function(error){deferred.reject(error);});
        }
        return deferred.promise;
    };
    quantimodoService.connectConnectorWithTokenDeferred = function(body){
        var deferred = $q.defer();
        quantimodoService.connectConnectorWithTokenToApi(body, function(){quantimodoService.refreshConnectors();}, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.connectConnectorWithAuthCodeDeferred = function(code, lowercaseConnectorName){
        var deferred = $q.defer();
        quantimodoService.connectWithAuthCodeToApi(code, lowercaseConnectorName, function(){quantimodoService.refreshConnectors();}, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.hideBrokenConnectors = function(connectors){
        for(var i = 0; i < connectors.length; i++){
            if(connectors[i].name === 'facebook' && $rootScope.isAndroid) {connectors[i].hide = true;}
        }
        return connectors;
    };
    // Name: The error message associated with the error. Usually this will
    // contain some information about this specific instance of the
    // error and is not used to group the errors (optional, default
    // none). (searchable)
    // Message: The error message associated with the error. Usually this will
    // contain some information about this specific instance of the
    // error and is not used to group the errors (optional, default
    // none). (searchable)
    quantimodoService.bugsnagNotify = function(name, message, metaData, severity){
        if(!metaData){ metaData = {}; }
        metaData.groupingHash = name;
        if(!metaData.stackTrace){ metaData.stackTrace = new Error().stack; }
        var deferred = $q.defer();
        if(!severity){ severity = "error"; }
        if(!message){ message = name; }
        console.error('NAME: ' + name + '. MESSAGE: ' + message + '. METADATA: ' + JSON.stringify(metaData));
        quantimodoService.setupBugsnag().then(function () {
            Bugsnag.notify(name, message, metaData, severity);
            deferred.resolve();
        }, function (error) {
            console.error(error);
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.reportErrorDeferred = function(exceptionOrError){
        var deferred = $q.defer();
        var stringifiedExceptionOrError = 'No error or exception data provided to quantimodoService';
        var stacktrace = 'No stacktrace provided to quantimodoService';
        if(exceptionOrError){
            stringifiedExceptionOrError = JSON.stringify(exceptionOrError);
            if(typeof exceptionOrError.stack !== 'undefined'){stacktrace = exceptionOrError.stack.toLocaleString();} else {stacktrace = stringifiedExceptionOrError;}
        }
        console.error('ERROR: ' + stringifiedExceptionOrError);
        quantimodoService.setupBugsnag().then(function () {
            Bugsnag.notify(stringifiedExceptionOrError, stacktrace, {groupingHash: stringifiedExceptionOrError}, "error");
            deferred.resolve();
        }, function (error) {
            console.error(error);
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.reportException = function(exception, name, metaData){
        console.error('ERROR: ' + exception.message);
        quantimodoService.setupBugsnag().then(function () {
            Bugsnag.notifyException(exception, name, metaData);
        }, function (error) {console.error(error);});
    };
    quantimodoService.setupBugsnag = function(){
        var deferred = $q.defer();
        if (typeof Bugsnag !== "undefined") {
            //Bugsnag.apiKey = "ae7bc49d1285848342342bb5c321a2cf";
            //Bugsnag.notifyReleaseStages = ['Production','Staging'];
            Bugsnag.releaseStage = quantimodoService.getEnv();
            Bugsnag.appVersion = config.appSettings.versionNumber;
            if($rootScope.user){
                Bugsnag.metaData = {
                    platform: ionic.Platform.platform(),
                    platformVersion: ionic.Platform.version(),
                    user: {name: $rootScope.user.displayName, email: $rootScope.user.email}
                };
            } else {Bugsnag.metaData = {platform: ionic.Platform.platform(), platformVersion: ionic.Platform.version()};}
            if(config){Bugsnag.metaData.appDisplayName = config.appSettings.appDisplayName;}
            deferred.resolve();
        } else {deferred.reject('Bugsnag is not defined');}
        return deferred.promise;
    };
    var geoLocationDebug = false;
    quantimodoService.getLocationInfoFromFoursquareOrGoogleMaps = function (latitude, longitude) {
        if(geoLocationDebug && $rootScope.user && $rootScope.user.id === 230){quantimodoService.reportErrorDeferred('getLocationInfoFromFoursquareOrGoogleMaps with longitude ' + longitude + ' and latitude,' + latitude);}
        var deferred = $q.defer();
        quantimodoService.getLocationInfoFromFoursquare($http).whatsAt(latitude, longitude).then(function (geoLookupResult) {
            if(geoLocationDebug && $rootScope.user && $rootScope.user.id === 230){quantimodoService.reportErrorDeferred('getLocationInfoFromFoursquare result: ' + JSON.stringify(geoLookupResult));}
            if (geoLookupResult.status === 200 && geoLookupResult.data.response.venues.length >= 1) {
                var bestMatch = geoLookupResult.data.response.venues[0];
                //convert the result to something the caller can use consistently
                geoLookupResult = {type: "foursquare", name: bestMatch.name, address: bestMatch.location.formattedAddress.join(", ")};
                //console.dir(bestMatch);
                deferred.resolve(geoLookupResult);
            } else {
                //ok, time to try google
                quantimodoService.getLocationInfoFromGoogleMaps($http).lookup(latitude, longitude).then(function (googleResponse) {
                    //console.debug('back from google with ');
                    if (googleResponse.data && googleResponse.data.results && googleResponse.data.results.length >= 1) {
                        //console.debug('did i come in here?');
                        var bestMatch = googleResponse.data.results[0];
                        //console.debug(JSON.stringify(bestMatch));
                        var geoLookupResult = {type: "geocode", address: bestMatch.formatted_address};
                        deferred.resolve(geoLookupResult);
                    }
                });
            }
        }, function(error) {
            quantimodoService.reportErrorDeferred('getLocationInfoFromFoursquareOrGoogleMaps error: ' + JSON.stringify(error));
        });
        return deferred.promise;
    };
    quantimodoService.getLocationInfoFromGoogleMaps = function ($http) {
        var GOOGLE_MAPS_API_KEY = window.private_keys.GOOGLE_MAPS_API_KEY;
        if (!GOOGLE_MAPS_API_KEY) {console.error('Please add GOOGLE_MAPS_API_KEY to private config');}
        function lookup(latitude, longitude) {
            return $http.get('https://maps.googleapis.com/maps/api/geocode/json?latlng=' + latitude + ',' + longitude + '&key=' + GOOGLE_MAPS_API_KEY);
        }
        return {lookup: lookup};
    };
    quantimodoService.getLocationInfoFromFoursquare = function ($http) {
        var FOURSQUARE_CLIENT_ID = window.private_keys.FOURSQUARE_CLIENT_ID;
        var FOURSQUARE_CLIENT_SECRET = window.private_keys.FOURSQUARE_CLIENT_SECRET;
        if (!FOURSQUARE_CLIENT_ID) {console.error('Please add FOURSQUARE_CLIENT_ID & FOURSQUARE_CLIENT_SECRET to private config');}
        function whatsAt(latitude, longitude) {
            return $http.get('https://api.foursquare.com/v2/venues/search?ll=' + latitude + ',' + longitude +
                '&intent=browse&radius=30&client_id=' + FOURSQUARE_CLIENT_ID + '&client_secret=' + FOURSQUARE_CLIENT_SECRET + '&v=20151201');
        }
        return {whatsAt: whatsAt};
    };
    function getLocationNameFromResult(getLookupResult){
        if (getLookupResult.name && getLookupResult.name !== "undefined") {return getLookupResult.name;}
        if (getLookupResult.address && getLookupResult.address !== "undefined") {return getLookupResult.address;}
        quantimodoService.reportErrorDeferred("No name or address property found in this coordinates result: " + JSON.stringify(getLookupResult));
    }
    quantimodoService.updateLocationInLocalStorage = function (geoLookupResult) {
        if(getLocationNameFromResult(geoLookupResult)) {localStorage.lastLocationName = getLocationNameFromResult(geoLookupResult);}
        if(geoLookupResult.type){localStorage.lastLocationResultType = geoLookupResult.type;} else {quantimodoService.bugsnagNotify('Geolocation error', "No geolocation lookup type", geoLookupResult);}
        if(geoLookupResult.latitude){localStorage.lastLatitude = geoLookupResult.latitude;} else {quantimodoService.bugsnagNotify('Geolocation error', "No latitude!", geoLookupResult);}
        if(geoLookupResult.longitude){localStorage.lastLongitude = geoLookupResult.longitude;} else {quantimodoService.bugsnagNotify('Geolocation error', "No longitude!", geoLookupResult);}
        localStorage.lastLocationUpdateTimeEpochSeconds = getUnixTimestampInSeconds();
        if(geoLookupResult.address) {
            localStorage.lastLocationAddress = geoLookupResult.address;
            if(geoLookupResult.address === localStorage.lastLocationName){localStorage.lastLocationNameAndAddress = localStorage.lastLocationAddress;
            } else{localStorage.lastLocationNameAndAddress = localStorage.lastLocationName + " (" + localStorage.lastLocationAddress + ")";}
        } else {quantimodoService.bugsnagNotify('Geolocation error', "No address found!", geoLookupResult);}
    };
    function getLastLocationNameFromLocalStorage(){
        var lastLocationName = localStorage.getItem('lastLocationName');
        if (lastLocationName && lastLocationName !== "undefined") {return lastLocationName;}
    }
    function getHoursAtLocation(){
        var secondsAtLocation = getUnixTimestampInSeconds() - localStorage.lastLocationUpdateTimeEpochSeconds;
        return Math.round(secondsAtLocation/3600 * 100) / 100;
    }
    function getGeoLocationSourceName(isBackground) {
        var sourceName = localStorage.lastLocationResultType + ' on ' + getSourceName();
        if(isBackground){sourceName = sourceName + " (Background Geolocation)";}
        return sourceName;
    }
    function weShouldPostLocation() {return $rootScope.isMobile && getLastLocationNameFromLocalStorage() && getHoursAtLocation();}
    quantimodoService.postLocationMeasurementAndSetLocationVariables = function (geoLookupResult, isBackground) {
        if (weShouldPostLocation()) {
            var newMeasurement = {
                variableName:  getLastLocationNameFromLocalStorage(),
                unitAbbreviatedName: 'h',
                startTimeEpoch: checkIfStartTimeEpochIsWithinTheLastYear(localStorage.lastLocationUpdateTimeEpochSeconds),
                sourceName: getGeoLocationSourceName(isBackground),
                value: getHoursAtLocation(),
                variableCategoryName: 'Location',
                location: localStorage.lastLocationAddress,
                combinationOperation: "SUM"
            };
            quantimodoService.postMeasurementDeferred(newMeasurement);
        } else {
            if(geoLocationDebug && $rootScope.user && $rootScope.user.id === 230){quantimodoService.reportErrorDeferred('Not posting location getLastLocationNameFromLocalStorage returns ' + getLastLocationNameFromLocalStorage());}
        }
        quantimodoService.updateLocationInLocalStorage(geoLookupResult);
    };
    function hasLocationNameChanged(geoLookupResult) {
        return getLastLocationNameFromLocalStorage() !== getLocationNameFromResult(geoLookupResult);
    }
    function coordinatesChanged(coordinates){
        return localStorage.getItem('lastLatitude') !== coordinates.latitude && localStorage.getItem('lastLongitude') !== coordinates.longitude;
    }
    function lookupGoogleAndFoursquareLocationAndPostMeasurement(coordinates, isBackground) {
        if(!coordinatesChanged(coordinates)){return;}
        quantimodoService.getLocationInfoFromFoursquareOrGoogleMaps(coordinates.latitude, coordinates.longitude).then(function (geoLookupResult) {
            if(geoLocationDebug && $rootScope.user && $rootScope.user.id === 230){quantimodoService.reportErrorDeferred('getLocationInfoFromFoursquareOrGoogleMaps was '+ JSON.stringify(geoLookupResult));}
            if (geoLookupResult.type === 'foursquare') {
                if(geoLocationDebug && $rootScope.user && $rootScope.user.id === 230){quantimodoService.reportErrorDeferred('Foursquare location name is ' + geoLookupResult.name + ' located at ' + geoLookupResult.address);}
            } else if (geoLookupResult.type === 'geocode') {
                if(geoLocationDebug && $rootScope.user && $rootScope.user.id === 230){quantimodoService.reportErrorDeferred('geocode address is ' + geoLookupResult.address);}
            } else {
                var map = 'https://maps.googleapis.com/maps/api/staticmap?center=' + coordinates.latitude + ',' + coordinates.longitude +
                    'zoom=13&size=300x300&maptype=roadmap&markers=color:blue%7Clabel:X%7C' + coordinates.latitude + ',' + coordinates.longitude;
                console.debug('Sorry, I\'ve got nothing. But here is a map!');
            }
            geoLookupResult.latitude = coordinates.latitude;
            geoLookupResult.longitude = coordinates.longitude;
            if(hasLocationNameChanged(geoLookupResult)){
                quantimodoService.postLocationMeasurementAndSetLocationVariables(geoLookupResult, isBackground);
            } else {
                if(geoLocationDebug && $rootScope.user && $rootScope.user.id === 230){quantimodoService.reportErrorDeferred('Location name has not changed!');}
            }
        });
    }
    quantimodoService.updateLocationVariablesAndPostMeasurementIfChanged = function () {
        var deferred = $q.defer();
        var message;
        if(!$rootScope.user){
            message = 'Not logging location because we do not have a user';
            console.debug(message);
            deferred.reject(message);
            return deferred.promise;
        }
        if(!$rootScope.user.trackLocation){
            message = 'Location tracking disabled for this user';
            console.debug(message);
            deferred.reject(message);
            return deferred.promise;
        }
        $ionicPlatform.ready(function() {
            var posOptions = {enableHighAccuracy: true, timeout: 20000, maximumAge: 0};
            $cordovaGeolocation.getCurrentPosition(posOptions).then(function (position) {
                quantimodoService.forecastioWeather(position.coords);
                lookupGoogleAndFoursquareLocationAndPostMeasurement(position.coords);
                deferred.resolve();
                //console.debug("My coordinates are: ", position.coords);
            }, function(error) {
                deferred.reject(error);
                if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
            });

        });
        return deferred.promise;
    };
    quantimodoService.backgroundGeolocationStart = function () {
        if(typeof backgroundGeoLocation === "undefined"){
            //console.warn('Cannot execute backgroundGeolocationStart because backgroundGeoLocation is not defined');
            return;
        }
        window.localStorage.setItem('bgGPS', 1);
        //console.debug('Starting quantimodoService.backgroundGeolocationStart');
        var callbackFn = function(coordinates) {
            console.debug("background location is " + JSON.stringify(coordinates));
            var isBackground = true;
            quantimodoService.forecastioWeather(coordinates);
            lookupGoogleAndFoursquareLocationAndPostMeasurement(coordinates, isBackground);
            backgroundGeoLocation.finish();
        };
        var failureFn = function(error) {
            var errorMessage = 'BackgroundGeoLocation error ' + JSON.stringify(error);
            console.error(errorMessage);
            quantimodoService.reportErrorDeferred(errorMessage);
        };
        backgroundGeoLocation.configure(callbackFn, failureFn, {
            desiredAccuracy: 1000, //Desired accuracy in meters. Possible values [0, 10, 100, 1000]. The lower the number, the more power devoted to GeoLocation resulting in higher accuracy readings. 1000 results in lowest power drain and least accurate readings.
            stationaryRadius: 20,
            distanceFilter: 30,
            locationService: 'ANDROID_DISTANCE_FILTER',  // TODO: Decide on setting https://github.com/mauron85/cordova-plugin-background-geolocation/blob/master/PROVIDERS.md
            debug: false,  // Created notifications with location info
            stopOnTerminate: false,
            notificationTitle: 'Recording Location',
            notificationText: 'Tap to open inbox',
            notificationIconLarge: null,
            notificationIconSmall: 'ic_stat_icon_bw',
            interval: 100 * 60 * 1000,  // These might not work with locationService: 'ANDROID_DISTANCE_FILTER',
            fastestInterval: 500000,  // These might not work with locationService: 'ANDROID_DISTANCE_FILTER',
            activitiesInterval: 15 * 60 * 1000  // These might not work with locationService: 'ANDROID_DISTANCE_FILTER',
        });
        backgroundGeoLocation.start();
    };
    quantimodoService.backgroundGeolocationInit = function () {
        var deferred = $q.defer();
        //console.debug('Starting quantimodoService.backgroundGeolocationInit');
        if ($rootScope.user && $rootScope.user.trackLocation) {
            $ionicPlatform.ready(function() { quantimodoService.backgroundGeolocationStart(); });
            deferred.resolve();
        } else {
            var error = 'quantimodoService.backgroundGeolocationInit failed because $rootScope.user.trackLocation is not true';
            //console.debug(error);
            deferred.reject(error);
        }
        return deferred.promise;
    };
    quantimodoService.backgroundGeolocationStop = function () {
        if(typeof backgroundGeoLocation !== "undefined"){
            window.localStorage.setItem('bgGPS', 0);
            backgroundGeoLocation.stop();
        }
    };
    var delayBeforePostingNotifications = 3 * 60 * 1000;
    var putTrackingReminderNotificationsInLocalStorageAndUpdateInbox = function (trackingReminderNotifications) {
        localStorage.setItem('lastGotNotificationsAt', getUnixTimestampInMilliseconds());
        trackingReminderNotifications = quantimodoService.attachVariableCategoryIcons(trackingReminderNotifications);
        quantimodoService.setLocalStorageItem('trackingReminderNotifications',
            JSON.stringify(trackingReminderNotifications)).then(function () {
            $rootScope.$broadcast('getTrackingReminderNotificationsFromLocalStorage');
            //console.debug('Just put ' + trackingReminderNotifications.length + ' trackingReminderNotifications in local storage');
        });
        $rootScope.numberOfPendingNotifications = trackingReminderNotifications.length;
        return trackingReminderNotifications;
    };
    quantimodoService.getSecondsSinceWeLastGotNotifications = function () {
        var lastGotNotificationsAt = localStorage.getItem('lastGotNotificationsAt');
        if(!lastGotNotificationsAt){ lastGotNotificationsAt = 0; }
        return parseInt((getUnixTimestampInMilliseconds() - lastGotNotificationsAt)/1000);
    };
    quantimodoService.postTrackingRemindersDeferred = function(trackingRemindersArray){
        var deferred = $q.defer();
        var postTrackingRemindersToApiAndHandleResponse = function(){
            quantimodoService.postTrackingRemindersToApi(trackingRemindersArray, function(response){
                if(response && response.data){
                    if(response.data.trackingReminderNotifications){putTrackingReminderNotificationsInLocalStorageAndUpdateInbox(response.data.trackingReminderNotifications);}
                    quantimodoService.deleteItemFromLocalStorage('trackingReminderSyncQueue');
                    if(response.data.trackingReminders){quantimodoService.setLocalStorageItem('trackingReminders', JSON.stringify(response.data.trackingReminders));}
                    if(response.data.userVariables){quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('userVariables', response.data.userVariables);}
                }
                deferred.resolve(response);
            }, function(error){deferred.reject(error);});
        };
        quantimodoService.postTrackingReminderNotificationsDeferred().then(function () {
            postTrackingRemindersToApiAndHandleResponse();
        }, function(error){
            postTrackingRemindersToApiAndHandleResponse();
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.postTrackingReminderNotificationsDeferred = function(successHandler, errorHandler){
        var deferred = $q.defer();
        var trackingReminderNotificationsArray = quantimodoService.getLocalStorageItemAsObject('notificationsSyncQueue');
        quantimodoService.deleteItemFromLocalStorage('notificationsSyncQueue');
        if(!trackingReminderNotificationsArray || !trackingReminderNotificationsArray.length){
            if(successHandler){successHandler();}
            deferred.resolve();
            return deferred.promise;
        }
        quantimodoService.postTrackingReminderNotificationsToApi(trackingReminderNotificationsArray, function(response){
            if(successHandler){successHandler();}
            deferred.resolve();
        }, function(error){
            var newNotificationsSyncQueue = quantimodoService.getLocalStorageItemAsObject('notificationsSyncQueue');
            if(newNotificationsSyncQueue){
                trackingReminderNotificationsArray = trackingReminderNotificationsArray.concat(newNotificationsSyncQueue);
            }
            quantimodoService.setLocalStorageItem('notificationsSyncQueue', JSON.stringify(trackingReminderNotificationsArray));
            if(errorHandler){errorHandler();}
            deferred.reject(error);
        });
        return deferred.promise;
    };
    var scheduleNotificationSync = function () {
        var trackingReminderNotificationSyncScheduled = localStorage.getItem('trackingReminderNotificationSyncScheduled');
        if(!trackingReminderNotificationSyncScheduled ||
            parseInt(trackingReminderNotificationSyncScheduled) < getUnixTimestampInMilliseconds() - delayBeforePostingNotifications){
            localStorage.setItem('trackingReminderNotificationSyncScheduled', getUnixTimestampInMilliseconds());
            $timeout(function() {
                localStorage.removeItem('trackingReminderNotificationSyncScheduled');
                // Post notification queue in 5 minutes if it's still there
                quantimodoService.postTrackingReminderNotificationsDeferred();
            }, delayBeforePostingNotifications);
        }
    };
    quantimodoService.skipTrackingReminderNotificationDeferred = function(trackingReminderNotification){
        var deferred = $q.defer();
        $rootScope.numberOfPendingNotifications -= $rootScope.numberOfPendingNotifications;
        quantimodoService.deleteElementOfLocalStorageItemById('trackingReminderNotifications', trackingReminderNotification.id);
        trackingReminderNotification.action = 'skip';
        quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('notificationsSyncQueue', trackingReminderNotification);
        scheduleNotificationSync();
        return deferred.promise;
    };
    quantimodoService.skipAllTrackingReminderNotificationsDeferred = function(params){
        var deferred = $q.defer();
        quantimodoService.deleteItemFromLocalStorage('trackingReminderNotifications');
        quantimodoService.skipAllTrackingReminderNotifications(params, function(response){
            if(response.success) {deferred.resolve();} else {deferred.reject();}
        }, function(error){
            if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.trackTrackingReminderNotificationDeferred = function(trackingReminderNotification){
        var deferred = $q.defer();
        console.debug('quantimodoService.trackTrackingReminderNotificationDeferred: Going to track ' + JSON.stringify(trackingReminderNotification));
        if(!trackingReminderNotification.variableName && trackingReminderNotification.trackingReminderNotificationId){
            var notificationFromLocalStorage = quantimodoService.getElementOfLocalStorageItemById('trackingReminderNotifications', trackingReminderNotification.trackingReminderNotificationId);
            if(notificationFromLocalStorage){
                if(typeof trackingReminderNotification.modifiedValue !== "undefined" && trackingReminderNotification.modifiedValue !== null){
                    notificationFromLocalStorage.modifiedValue = trackingReminderNotification.modifiedValue;
                }
                trackingReminderNotification = notificationFromLocalStorage;
            }
        }
        $rootScope.numberOfPendingNotifications -= $rootScope.numberOfPendingNotifications;
        quantimodoService.deleteElementOfLocalStorageItemById('trackingReminderNotifications', trackingReminderNotification.id);
        trackingReminderNotification.action = 'track';
        quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('notificationsSyncQueue', trackingReminderNotification);
        scheduleNotificationSync();
        return deferred.promise;
    };
    quantimodoService.snoozeTrackingReminderNotificationDeferred = function(body){
        var deferred = $q.defer();
        $rootScope.numberOfPendingNotifications -= $rootScope.numberOfPendingNotifications;
        quantimodoService.deleteElementOfLocalStorageItemById('trackingReminderNotifications', body.id);
        body.action = 'snooze';
        quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('notificationsSyncQueue', body);
        scheduleNotificationSync();
        return deferred.promise;
    };
    quantimodoService.getTrackingRemindersDeferred = function(variableCategoryName) {
        var deferred = $q.defer();
        quantimodoService.getTrackingRemindersFromLocalStorage(variableCategoryName).then(function (trackingReminders) {
            if (trackingReminders && trackingReminders.length) {deferred.resolve(trackingReminders);
            } else {quantimodoService.syncTrackingReminders().then(function (trackingReminders) {deferred.resolve(trackingReminders);});}
        });
        return deferred.promise;
    };
    quantimodoService.getTodayTrackingReminderNotificationsDeferred = function(variableCategoryName){
        var params = {
            minimumReminderTimeUtcString : quantimodoService.getLocalMidnightInUtcString(),
            maximumReminderTimeUtcString : quantimodoService.getTomorrowLocalMidnightInUtcString(),
            sort : 'reminderTime'
        };
        if (variableCategoryName) {params.variableCategoryName = variableCategoryName;}
        var deferred = $q.defer();
        quantimodoService.getTrackingReminderNotificationsFromApi(params, function(response){
            if(response.success) {
                var trackingReminderNotifications = putTrackingReminderNotificationsInLocalStorageAndUpdateInbox(response.data);
                deferred.resolve(trackingReminderNotifications);
            } else {deferred.reject("error");}
        }, function(error){
            if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.getTrackingReminderNotificationsFromLocalStorage = function (variableCategoryName) {
        var trackingReminderNotifications = quantimodoService.getElementsFromLocalStorageItemWithFilters(
            'trackingReminderNotifications', 'variableCategoryName', variableCategoryName);
        if(!trackingReminderNotifications){ trackingReminderNotifications = []; }
        if(trackingReminderNotifications.length){
            $rootScope.numberOfPendingNotifications = trackingReminderNotifications.length;
            if (window.chrome && window.chrome.browserAction && !variableCategoryName) {
                //noinspection JSUnresolvedFunction
                chrome.browserAction.setBadgeText({text: "?"});
                //chrome.browserAction.setBadgeText({text: String($rootScope.numberOfPendingNotifications)});
            }
        }
        return trackingReminderNotifications;
    };
    quantimodoService.getTrackingReminderNotificationsDeferred = function(variableCategoryName){
        var deferred = $q.defer();
        var trackingReminderNotifications =
            quantimodoService.getTrackingReminderNotificationsFromLocalStorage(variableCategoryName);
        if(trackingReminderNotifications && trackingReminderNotifications.length){
            deferred.resolve(trackingReminderNotifications);
            return deferred.promise;
        }
        $rootScope.numberOfPendingNotifications = 0;
        quantimodoService.refreshTrackingReminderNotifications().then(function () {
            trackingReminderNotifications = quantimodoService.getElementsFromLocalStorageItemWithFilters(
                'trackingReminderNotifications', 'variableCategoryName', variableCategoryName);
            deferred.resolve(trackingReminderNotifications);
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.refreshTrackingReminderNotifications = function(){
        var deferred = $q.defer();
        var options = {};
        options.minimumSecondsBetweenRequests = 3;
        if(!canWeMakeRequestYet('GET', 'refreshTrackingReminderNotifications', options)){
            deferred.reject('Already called refreshTrackingReminderNotifications within last ' + options.minimumSecondsBetweenRequests + ' seconds!  Rejecting promise!');
            return deferred.promise;
        }
        quantimodoService.postTrackingReminderNotificationsDeferred(function(){
            var currentDateTimeInUtcStringPlus5Min = quantimodoService.getCurrentDateTimeInUtcStringPlusMin(5);
            var params = {};
            params.reminderTime = '(lt)' + currentDateTimeInUtcStringPlus5Min;
            params.sort = '-reminderTime';
            quantimodoService.getTrackingReminderNotificationsFromApi(params, function(response){
                if(response.success) {
                    quantimodoService.registerDeviceToken();  // Double check because it's not getting posted sometimes for some reason
                    var trackingReminderNotifications = putTrackingReminderNotificationsInLocalStorageAndUpdateInbox(response.data);
                    if (window.chrome && window.chrome.browserAction) {
                        chrome.browserAction.setBadgeText({text: "?"});
                        //chrome.browserAction.setBadgeText({text: String($rootScope.numberOfPendingNotifications)});
                    }
                    $rootScope.refreshingTrackingReminderNotifications = false;
                    deferred.resolve(trackingReminderNotifications);
                }
                else {
                    $rootScope.refreshingTrackingReminderNotifications = false;
                    deferred.reject("error");
                }
            }, function(error){
                if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
                $rootScope.refreshingTrackingReminderNotifications = false;
                deferred.reject(error);
            });
        }, function(error){
            if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
            $rootScope.refreshingTrackingReminderNotifications = false;
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.getTrackingReminderByIdDeferred = function(reminderId){
        var deferred = $q.defer();
        var params = {id : reminderId};
        quantimodoService.getTrackingRemindersFromApi(params, function(remindersResponse){
            var trackingReminders = remindersResponse.data;
            if(remindersResponse.success) {deferred.resolve(trackingReminders);} else {deferred.reject("error");}
        }, function(error){
            if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.getCurrentTrackingReminderNotificationsFromApi = function(category, today){
        var localMidnightInUtcString = quantimodoService.getLocalMidnightInUtcString();
        var currentDateTimeInUtcString = quantimodoService.getCurrentDateTimeInUtcString();
        var params = {};
        if(today && !category){
            var reminderTime = '(gt)' + localMidnightInUtcString;
            params = {reminderTime : reminderTime, sort : 'reminderTime'};
        }
        if(!today && category){params = {variableCategoryName : category, reminderTime : '(lt)' + currentDateTimeInUtcString};}
        if(today && category){params = {reminderTime : '(gt)' + localMidnightInUtcString, variableCategoryName : category, sort : 'reminderTime'};}
        if(!today && !category){params = {reminderTime : '(lt)' + currentDateTimeInUtcString};}
        var deferred = $q.defer();
        var successHandler = function(trackingReminderNotifications) {
            if (trackingReminderNotifications.success) {deferred.resolve(trackingReminderNotifications.data);}
            else {deferred.reject("error");}
        };
        var errorHandler = function(error){
            if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
            deferred.reject(error);
        };
        quantimodoService.get('api/v1/trackingReminderNotifications',
            ['variableCategoryName', 'id', 'sort', 'limit','offset','updatedAt', 'reminderTime'],
            params, successHandler, errorHandler);
        return deferred.promise;
    };
    quantimodoService.getTrackingReminderNotificationsDeferredFromLocalStorage = function(category, today){
        var localMidnightInUtcString = quantimodoService.getLocalMidnightInUtcString();
        var currentDateTimeInUtcString = quantimodoService.getCurrentDateTimeInUtcString();
        var trackingReminderNotifications = [];
        if(today && !category){
            trackingReminderNotifications = quantimodoService.getElementsFromLocalStorageItemWithFilters(
                'trackingReminderNotifications', null, null, null, null, 'reminderTime', localMidnightInUtcString);
            var reminderTime = '(gt)' + localMidnightInUtcString;
        }
        if(!today && category){
            trackingReminderNotifications = quantimodoService.getElementsFromLocalStorageItemWithFilters(
                'trackingReminderNotifications', 'variableCategoryName', category, 'reminderTime', currentDateTimeInUtcString, null, null);
        }
        if(today && category){
            trackingReminderNotifications = quantimodoService.getElementsFromLocalStorageItemWithFilters(
                'trackingReminderNotifications', 'variableCategoryName', category, null, null, 'reminderTime', localMidnightInUtcString);
        }
        if(!today && !category){
            trackingReminderNotifications = quantimodoService.getElementsFromLocalStorageItemWithFilters(
                'trackingReminderNotifications', null, null, 'reminderTime', currentDateTimeInUtcString, null, null);
        }
        return trackingReminderNotifications;
    };
    quantimodoService.deleteTrackingReminderFromLocalStorage = function(reminderToDelete){
        var allTrackingReminders = quantimodoService.getLocalStorageItemAsObject('trackingReminders');
        var trackingRemindersToKeep = [];
        angular.forEach(allTrackingReminders, function(reminderFromLocalStorage, key) {
            if(!(reminderFromLocalStorage.variableName === reminderToDelete.variableName &&
                reminderFromLocalStorage.reminderFrequency === reminderToDelete.reminderFrequency &&
                reminderFromLocalStorage.reminderStartTime === reminderToDelete.reminderStartTime)){
                trackingRemindersToKeep.push(reminderFromLocalStorage);
            }
        });
        quantimodoService.setLocalStorageItem('trackingReminders', trackingRemindersToKeep);
    };
    quantimodoService.deleteTrackingReminderDeferred = function(reminderToDelete){
        var deferred = $q.defer();
        quantimodoService.deleteTrackingReminderFromLocalStorage(reminderToDelete);
        if(!reminderToDelete.id){
            deferred.resolve();
            return deferred.promise;
        }
        quantimodoService.deleteTrackingReminder(reminderToDelete.id, function(response){
            if(response && response.success) {
                // Delete again in case we refreshed before deletion completed
                quantimodoService.deleteTrackingReminderFromLocalStorage(reminderToDelete);
                deferred.resolve();
            }
            else {deferred.reject();}
        }, function(error){
            if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error);
            deferred.reject(error);
        });
        return deferred.promise;
    };
    // We need to keep this in case we want offline reminders
    quantimodoService.addRatingTimesToDailyReminders = function(reminders) {
        var index;
        for (index = 0; index < reminders.length; ++index) {
            if (reminders[index].valueAndFrequencyTextDescription &&
                reminders[index].valueAndFrequencyTextDescription.indexOf('daily') > 0 &&
                reminders[index].valueAndFrequencyTextDescription.indexOf(' at ') === -1 &&
                reminders[index].valueAndFrequencyTextDescription.toLowerCase().indexOf('disabled') === -1) {
                reminders[index].valueAndFrequencyTextDescription = reminders[index].valueAndFrequencyTextDescription + ' at ' +
                    quantimodoService.convertReminderTimeStringToMoment(reminders[index].reminderStartTime).format("h:mm A");
            }
        }
        return reminders;
    };
    quantimodoService.getValueAndFrequencyTextDescriptionWithTime = function(trackingReminder){
        if(trackingReminder.reminderFrequency === 86400){
            if(trackingReminder.unitCategoryName === 'Rating'){return 'Daily at ' + quantimodoService.humanFormat(trackingReminder.reminderStartTimeLocal);}
            if(trackingReminder.defaultValue){return trackingReminder.defaultValue + ' ' + trackingReminder.unitAbbreviatedName + ' daily at ' + quantimodoService.humanFormat(trackingReminder.reminderStartTimeLocal);}
            return 'Daily at ' + quantimodoService.humanFormat(trackingReminder.reminderStartTimeLocal);
        } else if (trackingReminder.reminderFrequency === 0){
            if(trackingReminder.unitCategoryName === "Rating"){return "As-Needed";}
            if(trackingReminder.defaultValue){return trackingReminder.defaultValue + ' ' + trackingReminder.unitAbbreviatedName + ' as-needed';}
            return "As-Needed";
        } else {
            if(trackingReminder.unitCategoryName === 'Rating'){return 'Rate every ' + trackingReminder.reminderFrequency/3600 + " hours";}
            if(trackingReminder.defaultValue){return trackingReminder.defaultValue + ' ' + trackingReminder.unitAbbreviatedName + ' every ' + trackingReminder.reminderFrequency/3600 + " hours";}
            return 'Every ' + trackingReminder.reminderFrequency/3600 + " hours";
        }
    };
    quantimodoService.convertReminderTimeStringToMoment = function(reminderTimeString) {
        var now = new Date();
        var hourOffsetFromUtc = now.getTimezoneOffset()/60;
        var parsedReminderTimeUtc = reminderTimeString.split(':');
        var minutes = parsedReminderTimeUtc[1];
        var hourUtc = parseInt(parsedReminderTimeUtc[0]);
        var localHour = hourUtc - parseInt(hourOffsetFromUtc);
        if(localHour > 23){localHour = localHour - 24;}
        if(localHour < 0){localHour = localHour + 24;}
        return moment().hours(localHour).minutes(minutes);
    };
    quantimodoService.addToTrackingReminderSyncQueue = function(trackingReminder) {
        quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('trackingReminderSyncQueue', trackingReminder);
    };
    quantimodoService.syncTrackingReminders = function(force) {
        var deferred = $q.defer();
        var trackingReminderSyncQueue = quantimodoService.getLocalStorageItemAsObject('trackingReminderSyncQueue');
        if(trackingReminderSyncQueue && trackingReminderSyncQueue.length){
            quantimodoService.postTrackingRemindersDeferred(trackingReminderSyncQueue).then(function (response) {
                deferred.resolve(response);
            }, function(error) { if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); } console.error(error); });
        } else {
            quantimodoService.getTrackingRemindersFromApi({force: force}, function(remindersResponse){
                if(remindersResponse && remindersResponse.data) {
                    quantimodoService.setLocalStorageItem('trackingReminders', JSON.stringify(remindersResponse.data));
                    deferred.resolve(remindersResponse.data);
                } else { deferred.reject("error in getTrackingRemindersFromApi"); }
            }, function(error){
                if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); }
                deferred.reject(error);
            });
        }
        return deferred.promise;
    };
    quantimodoService.deleteTrackingReminderNotificationFromLocalStorage = function(body){
        var trackingReminderNotificationId = body;
        if(isNaN(trackingReminderNotificationId) && body.trackingReminderNotification){trackingReminderNotificationId = body.trackingReminderNotification.id;}
        if(isNaN(trackingReminderNotificationId) && body.trackingReminderNotificationId){trackingReminderNotificationId = body.trackingReminderNotificationId;}
        $rootScope.numberOfPendingNotifications -= $rootScope.numberOfPendingNotifications;
        quantimodoService.deleteElementOfLocalStorageItemById('trackingReminderNotifications',
            trackingReminderNotificationId);
        /* We don't have separate items for categories
         if(body.trackingReminderNotification && typeof body.trackingReminderNotification.variableCategoryName !== "undefined"){
         quantimodoService.deleteElementOfLocalStorageItemById('trackingReminderNotifications' +
         body.trackingReminderNotification.variableCategoryName,
         trackingReminderNotificationId);
         }*/
    };
    quantimodoService.groupTrackingReminderNotificationsByDateRange = function (trackingReminderNotifications) {
        var result = [];
        var reference = moment().local();
        var today = reference.clone().startOf('day');
        var yesterday = reference.clone().subtract(1, 'days').startOf('day');
        var weekold = reference.clone().subtract(7, 'days').startOf('day');
        var monthold = reference.clone().subtract(30, 'days').startOf('day');
        var todayResult = trackingReminderNotifications.filter(function (trackingReminderNotification) {
            /** @namespace trackingReminderNotification.trackingReminderNotificationTime */
            return moment.utc(trackingReminderNotification.trackingReminderNotificationTime).local().isSame(today, 'd') === true;
        });
        if (todayResult.length) {result.push({name: "Today", trackingReminderNotifications: todayResult});}
        var yesterdayResult = trackingReminderNotifications.filter(function (trackingReminderNotification) {
            return moment.utc(trackingReminderNotification.trackingReminderNotificationTime).local().isSame(yesterday, 'd') === true;
        });
        if (yesterdayResult.length) {result.push({name: "Yesterday", trackingReminderNotifications: yesterdayResult});}
        var last7DayResult = trackingReminderNotifications.filter(function (trackingReminderNotification) {
            var date = moment.utc(trackingReminderNotification.trackingReminderNotificationTime).local();
            return date.isAfter(weekold) === true && date.isSame(yesterday, 'd') !== true && date.isSame(today, 'd') !== true;
        });
        if (last7DayResult.length) {result.push({name: "Last 7 Days", trackingReminderNotifications: last7DayResult});}
        var last30DayResult = trackingReminderNotifications.filter(function (trackingReminderNotification) {
            var date = moment.utc(trackingReminderNotification.trackingReminderNotificationTime).local();
            return date.isAfter(monthold) === true && date.isBefore(weekold) === true && date.isSame(yesterday, 'd') !== true && date.isSame(today, 'd') !== true;
        });
        if (last30DayResult.length) {result.push({name: "Last 30 Days", trackingReminderNotifications: last30DayResult});}
        var olderResult = trackingReminderNotifications.filter(function (trackingReminderNotification) {
            return moment.utc(trackingReminderNotification.trackingReminderNotificationTime).local().isBefore(monthold) === true;
        });
        if (olderResult.length) {result.push({name: "Older", trackingReminderNotifications: olderResult});}
        return result;
    };
    quantimodoService.getTrackingRemindersFromLocalStorage = function (variableCategoryName){
        var deferred = $q.defer();
        var filteredReminders = [];
        var unfilteredRemindersString = quantimodoService.getLocalStorageItemAsString('trackingReminders');
        if(!unfilteredRemindersString){
            deferred.resolve([]);
            return deferred.promise;
        }
        if(unfilteredRemindersString.indexOf('[object Object]') !== -1){
            quantimodoService.deleteLargeLocalStorageItems(['trackingReminders']);
            unfilteredRemindersString = null;
        }
        var unfilteredReminders = JSON.parse(unfilteredRemindersString);
        if(!unfilteredReminders){unfilteredReminders = [];}
        var syncQueue = JSON.parse(quantimodoService.getLocalStorageItemAsString('trackingReminderSyncQueue'));
        if(syncQueue){unfilteredReminders = unfilteredReminders.concat(syncQueue);}
        unfilteredReminders = quantimodoService.attachVariableCategoryIcons(unfilteredReminders);
        if(unfilteredReminders) {
            if(variableCategoryName && variableCategoryName !== 'Anything') {
                for(var j = 0; j < unfilteredReminders.length; j++){
                    if(variableCategoryName === unfilteredReminders[j].variableCategoryName){
                        filteredReminders.push(unfilteredReminders[j]);
                    }
                }
            } else {
                filteredReminders = unfilteredReminders;
            }
            filteredReminders = quantimodoService.addRatingTimesToDailyReminders(filteredReminders); //We need to keep this in case we want offline reminders
            deferred.resolve(filteredReminders);
        }
        return deferred.promise;
    };
    quantimodoService.createDefaultReminders = function () {
        var deferred = $q.defer();
        quantimodoService.getLocalStorageItemAsStringWithCallback('defaultRemindersCreated', function (defaultRemindersCreated) {
            if(JSON.parse(defaultRemindersCreated) !== true) {
                var defaultReminders = quantimodoService.getDefaultReminders();
                if(defaultReminders && defaultReminders.length){
                    quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront(
                        'trackingReminderSyncQueue', defaultReminders).then(function () {
                        quantimodoService.syncTrackingReminders().then(function (trackingReminders){ deferred.resolve(trackingReminders);});
                    });
                    console.debug('Creating default reminders ' + JSON.stringify(defaultReminders));
                }
            } else {
                deferred.reject('Default reminders already created');
                console.debug('Default reminders already created');
            }
        });
        return deferred.promise;
    };

    // ChartService
    var useLocalImages = function (correlationObjects) {
        for(var i = 0; i < correlationObjects.length; i++){
            correlationObjects[i].gaugeImage = correlationObjects[i].gaugeImage.substring(correlationObjects[i].gaugeImage.lastIndexOf("/") + 1);
            correlationObjects[i].gaugeImage = 'img/gauges/246-120/' + correlationObjects[i].gaugeImage;
            correlationObjects[i].causeVariableImageUrl = correlationObjects[i].causeVariableImageUrl.substring(correlationObjects[i].causeVariableImageUrl.lastIndexOf("/") + 1);
            correlationObjects[i].causeVariableImageUrl = 'img/variable_categories/' + correlationObjects[i].causeVariableImageUrl;
            correlationObjects[i].effectVariableImageUrl = correlationObjects[i].effectVariableImageUrl.substring(correlationObjects[i].effectVariableImageUrl.lastIndexOf("/") + 1);
            correlationObjects[i].effectVariableImageUrl = 'img/variable_categories/' + correlationObjects[i].effectVariableImageUrl;
        }
        return correlationObjects;
    };
    quantimodoService.clearCorrelationCache = function(){
        quantimodoService.deleteCachedResponse('aggregatedCorrelations');
        quantimodoService.deleteCachedResponse('correlations');
    };
    quantimodoService.getAggregatedCorrelationsDeferred = function(params){
        var deferred = $q.defer();
        var cachedCorrelations = quantimodoService.getCachedResponse('aggregatedCorrelations', params);
        if(cachedCorrelations){
            deferred.resolve(cachedCorrelations);
            return deferred.promise;
        }
        quantimodoService.getAggregatedCorrelationsFromApi(params, function(correlationObjects){
            correlationObjects = useLocalImages(correlationObjects);
            quantimodoService.storeCachedResponse('aggregatedCorrelations', params, correlationObjects);
            deferred.resolve(correlationObjects);
        }, function(error){
            if (typeof Bugsnag !== "undefined") {Bugsnag.notify(error, JSON.stringify(error), {}, "error");}
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.getNotesDeferred = function(variableName){
        var deferred = $q.defer();
        quantimodoService.getNotesFromApi({variableName: variableName}, function(response){
            deferred.resolve(response.data);
        }, function(error){
            if (typeof Bugsnag !== "undefined") {Bugsnag.notify(error, JSON.stringify(error), {}, "error");}
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.getCorrelationsDeferred = function (params) {
        var deferred = $q.defer();
        var cachedCorrelationsResponseData = quantimodoService.getCachedResponse('correlations', params);
        if(cachedCorrelationsResponseData){
            deferred.resolve(cachedCorrelationsResponseData);
            return deferred.promise;
        }
        quantimodoService.getUserCorrelationsFromApi(params, function(response){
            response.data.correlations = useLocalImages(response.data.correlations);
            quantimodoService.storeCachedResponse('correlations', params, response.data);
            deferred.resolve(response.data);
        }, function(error){
            if (typeof Bugsnag !== "undefined") {Bugsnag.notify(error, JSON.stringify(error), {}, "error");}
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.postVoteDeferred = function(correlationObject){
        var deferred = $q.defer();
        quantimodoService.postVoteToApi(correlationObject, function(response){
            quantimodoService.clearCorrelationCache();
            deferred.resolve(true);
        }, function(error){
            console.error("postVote response", error);
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.deleteVoteDeferred = function(correlationObject){
        var deferred = $q.defer();
        quantimodoService.deleteVoteToApi(correlationObject, function(response){
            quantimodoService.clearCorrelationCache();
            deferred.resolve(true);
        }, function(error){
            console.error("deleteVote response", error);
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.getRatingInfo = function() {
        var ratingInfo =
            {
                1 : {
                    displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[0],
                    positiveImage: quantimodoService.ratingImages.positive[0],
                    negativeImage: quantimodoService.ratingImages.negative[0],
                    numericImage:  quantimodoService.ratingImages.numeric[0],
                },
                2 : {
                    displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[1],
                    positiveImage: quantimodoService.ratingImages.positive[1],
                    negativeImage: quantimodoService.ratingImages.negative[1],
                    numericImage:  quantimodoService.ratingImages.numeric[1],
                },
                3 : {
                    displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[2],
                    positiveImage: quantimodoService.ratingImages.positive[2],
                    negativeImage: quantimodoService.ratingImages.negative[2],
                    numericImage:  quantimodoService.ratingImages.numeric[2],
                },
                4 : {
                    displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[3],
                    positiveImage: quantimodoService.ratingImages.positive[3],
                    negativeImage: quantimodoService.ratingImages.negative[3],
                    numericImage:  quantimodoService.ratingImages.numeric[3],
                },
                5 : {
                    displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[4],
                    positiveImage: quantimodoService.ratingImages.positive[4],
                    negativeImage: quantimodoService.ratingImages.negative[4],
                    numericImage:  quantimodoService.ratingImages.numeric[4],
                }
            };
        return ratingInfo;
    };
    quantimodoService.getPrimaryOutcomeVariableOptionLabels = function(shouldShowNumbers){
        if(shouldShowNumbers || !quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels){return ['1',  '2',  '3',  '4', '5'];
        } else {return quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels;}
    };
    quantimodoService.getPositiveImageByRatingValue = function(numericValue){
        var positiveRatingOptions = quantimodoService.getPositiveRatingOptions();
        var filteredList = positiveRatingOptions.filter(function(option){return option.numericValue === numericValue;});
        return filteredList.length? filteredList[0].img || false : false;
    };
    quantimodoService.getNegativeImageByRatingValue = function(numericValue){
        var negativeRatingOptions = this.getNegativeRatingOptions();
        var filteredList = negativeRatingOptions.filter(function(option){return option.numericValue === numericValue;});
        return filteredList.length? filteredList[0].img || false : false;
    };
    quantimodoService.getNumericImageByRatingValue = function(numericValue){
        var numericRatingOptions = this.getNumericRatingOptions();
        var filteredList = numericRatingOptions.filter(function(option){return option.numericValue === numericValue;});
        return filteredList.length? filteredList[0].img || false : false;
    };
    quantimodoService.getPrimaryOutcomeVariableByNumber = function(num){
        return quantimodoService.getPrimaryOutcomeVariable().ratingValueToTextConversionDataSet[num] ? quantimodoService.getPrimaryOutcomeVariable().ratingValueToTextConversionDataSet[num] : false;
    };
    quantimodoService.getRatingFaceImageByText = function(lowerCaseRatingTextDescription){
        var positiveRatingOptions = quantimodoService.getPositiveRatingOptions();
        var filteredList = positiveRatingOptions.filter(
            function(option){return option.lowerCaseTextDescription === lowerCaseRatingTextDescription;});
        return filteredList.length ? filteredList[0].img || false : false;
    };
    quantimodoService.getPositiveRatingOptions = function() {
        return [
            {
                numericValue: 1,
                displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[0],
                lowerCaseTextDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[0].toLowerCase(),
                img: quantimodoService.ratingImages.positive[0]
            },
            {
                numericValue: 2,
                displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[1],
                lowerCaseTextDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[1].toLowerCase(),
                img: quantimodoService.ratingImages.positive[1]
            },
            {
                numericValue: 3,
                displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[2],
                lowerCaseTextDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[2].toLowerCase(),
                img: quantimodoService.ratingImages.positive[2]
            },
            {
                numericValue: 4,
                displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[3],
                lowerCaseTextDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[3].toLowerCase(),
                img: quantimodoService.ratingImages.positive[3]
            },
            {
                numericValue: 5,
                displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[4],
                lowerCaseTextDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[4].toLowerCase(),
                img: quantimodoService.ratingImages.positive[4]
            }
        ];
    };
    quantimodoService.getNegativeRatingOptions = function() {
        return [
            {
                numericValue: 1,
                displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[4],
                value: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[4].toLowerCase(),
                img: quantimodoService.ratingImages.negative[0]
            },
            {
                numericValue: 2,
                displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[3],
                value: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[3].toLowerCase(),
                img: quantimodoService.ratingImages.negative[1]
            },
            {
                numericValue: 3,
                displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[2],
                value: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[2].toLowerCase(),
                img: quantimodoService.ratingImages.negative[2]
            },
            {
                numericValue: 4,
                displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[1],
                value: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[1].toLowerCase(),
                img: quantimodoService.ratingImages.negative[3]
            },
            {
                numericValue: 5,
                displayDescription: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[0],
                value: quantimodoService.getPrimaryOutcomeVariable().ratingOptionLabels[0].toLowerCase(),
                img: quantimodoService.ratingImages.negative[4]
            }
        ];
    };
    quantimodoService.getNumericRatingOptions = function() {
        return [
            {numericValue: 1, img: quantimodoService.ratingImages.numeric[0]},
            {numericValue: 2, img: quantimodoService.ratingImages.numeric[1]},
            {numericValue: 3, img: quantimodoService.ratingImages.numeric[2]},
            {numericValue: 4, img: quantimodoService.ratingImages.numeric[3]},
            {numericValue: 5, img: quantimodoService.ratingImages.numeric[4]}
        ];
    };
    quantimodoService.addInfoAndImagesToMeasurements = function (measurements){
        var ratingInfo = quantimodoService.getRatingInfo();
        var index;
        for (index = 0; index < measurements.length; ++index) {
            if(!measurements[index].variableName){measurements[index].variableName = measurements[index].variable;}
            if(measurements[index].variableName === quantimodoService.getPrimaryOutcomeVariable().name){
                measurements[index].valence = quantimodoService.getPrimaryOutcomeVariable().valence;
            }
            if (measurements[index].unitAbbreviatedName === '/5') {measurements[index].roundedValue = Math.round(measurements[index].value);}
            if (measurements[index].unitAbbreviatedName.charAt(0) === '/') {
                // don't add space between value and unit
                measurements[index].valueUnitVariableName = measurements[index].value + measurements[index].unitAbbreviatedName + ' ' + measurements[index].variableName;
            }
            else {
                // add space between value and unit
                measurements[index].valueUnitVariableName = measurements[index].value + " " + measurements[index].unitAbbreviatedName + ' ' + measurements[index].variableName;
            }
            if (measurements[index].unitAbbreviatedName === '%') {
                measurements[index].roundedValue = Math.round(measurements[index].value / 25 + 1);
            }
            if (measurements[index].roundedValue && measurements[index].valence === 'positive' && ratingInfo[measurements[index].roundedValue]) {
                measurements[index].image = measurements[index].image = ratingInfo[measurements[index].roundedValue].positiveImage;
            }
            if (measurements[index].roundedValue && measurements[index].valence === 'negative' && ratingInfo[measurements[index].roundedValue]) {
                measurements[index].image = ratingInfo[measurements[index].roundedValue].negativeImage;
            }
            if (!measurements[index].image && measurements[index].roundedValue && ratingInfo[measurements[index].roundedValue]) {
                measurements[index].image = ratingInfo[measurements[index].roundedValue].numericImage;
            }
            if(measurements[index].image){ measurements[index].pngPath = measurements[index].image; }
            if (measurements[index].variableCategoryName){
                measurements[index].icon = quantimodoService.getVariableCategoryIcon(measurements[index].variableCategoryName);
            }
        }
        return measurements;
    };
    quantimodoService.getWeekdayChartConfigForPrimaryOutcome = function () {
        var deferred = $q.defer();
        deferred.resolve(quantimodoService.processDataAndConfigureWeekdayChart(
            quantimodoService.getLocalStorageItemAsObject('primaryOutcomeVariableMeasurements'),
            quantimodoService.getPrimaryOutcomeVariable()));
        return deferred.promise;
    };
    quantimodoService.generateDistributionArray = function(allMeasurements){
        var distributionArray = [];
        var valueLabel;
        for (var i = 0; i < allMeasurements.length; i++) {
            if(!allMeasurements[i]){return distributionArray;}
            valueLabel = String(allMeasurements[i].value);
            if(valueLabel.length > 1) {valueLabel = String(Number(allMeasurements[i].value.toPrecision(1)));}
            if(typeof distributionArray[valueLabel] === "undefined"){distributionArray[valueLabel] = 0;}
            distributionArray[valueLabel] += 1;
        }
        return distributionArray;
    };
    quantimodoService.generateWeekdayMeasurementArray = function(allMeasurements){
        if(!allMeasurements){
            console.error('No measurements provided to generateWeekdayMeasurementArray');
            return false;
        }
        var weekdayMeasurementArrays = [];
        var startTimeMilliseconds = null;
        for (var i = 0; i < allMeasurements.length; i++) {
            startTimeMilliseconds = allMeasurements[i].startTimeEpoch * 1000;
            if(typeof weekdayMeasurementArrays[moment(startTimeMilliseconds).day()] === "undefined"){
                weekdayMeasurementArrays[moment(startTimeMilliseconds).day()] = [];
            }
            weekdayMeasurementArrays[moment(startTimeMilliseconds).day()].push(allMeasurements[i]);
        }
        return weekdayMeasurementArrays;
    };
    quantimodoService.generateMonthlyMeasurementArray = function(allMeasurements){
        if(!allMeasurements){
            console.error('No measurements provided to generateMonthlyMeasurementArray');
            return false;
        }
        var monthlyMeasurementArrays = [];
        var startTimeMilliseconds = null;
        for (var i = 0; i < allMeasurements.length; i++) {
            startTimeMilliseconds = allMeasurements[i].startTimeEpoch * 1000;
            if(typeof monthlyMeasurementArrays[moment(startTimeMilliseconds).month()] === "undefined"){
                monthlyMeasurementArrays[moment(startTimeMilliseconds).month()] = [];
            }
            monthlyMeasurementArrays[moment(startTimeMilliseconds).month()].push(allMeasurements[i]);
        }
        return monthlyMeasurementArrays;
    };
    quantimodoService.generateHourlyMeasurementArray = function(allMeasurements){
        var hourlyMeasurementArrays = [];
        for (var i = 0; i < allMeasurements.length; i++) {
            var startTimeMilliseconds = allMeasurements[i].startTimeEpoch * 1000;
            if (typeof hourlyMeasurementArrays[moment(startTimeMilliseconds).hour()] === "undefined") {
                hourlyMeasurementArrays[moment(startTimeMilliseconds).hour()] = [];
            }
            hourlyMeasurementArrays[moment(startTimeMilliseconds).hour()].push(allMeasurements[i]);
        }
        return hourlyMeasurementArrays;
    };
    quantimodoService.calculateAverageValueByHour = function(hourlyMeasurementArrays) {
        var sumByHour = [];
        var averageValueByHourArray = [];
        for (var k = 0; k < 23; k++) {
            if (typeof hourlyMeasurementArrays[k] !== "undefined") {
                for (var j = 0; j < hourlyMeasurementArrays[k].length; j++) {
                    if (typeof sumByHour[k] === "undefined") {sumByHour[k] = 0;}
                    sumByHour[k] = sumByHour[k] + hourlyMeasurementArrays[k][j].value;
                }
                averageValueByHourArray[k] = sumByHour[k] / (hourlyMeasurementArrays[k].length);
            } else {
                averageValueByHourArray[k] = null;
                //console.debug("No data for hour " + k);
            }
        }
        return averageValueByHourArray;
    };
    quantimodoService.calculateAverageValueByWeekday = function(weekdayMeasurementArrays) {
        var sumByWeekday = [];
        var averageValueByWeekdayArray = [];
        for (var k = 0; k < 7; k++) {
            if (typeof weekdayMeasurementArrays[k] !== "undefined") {
                for (var j = 0; j < weekdayMeasurementArrays[k].length; j++) {
                    if (typeof sumByWeekday[k] === "undefined") {sumByWeekday[k] = 0;}
                    sumByWeekday[k] = sumByWeekday[k] + weekdayMeasurementArrays[k][j].value;
                }
                averageValueByWeekdayArray[k] = sumByWeekday[k] / (weekdayMeasurementArrays[k].length);
            } else {
                averageValueByWeekdayArray[k] = null;
                //console.debug("No data for day " + k);
            }
        }
        return averageValueByWeekdayArray;
    };
    quantimodoService.calculateAverageValueByMonthly = function(monthlyMeasurementArrays) {
        var sumByMonthly = [];
        var averageValueByMonthlyArray = [];
        for (var k = 0; k < 12; k++) {
            if (typeof monthlyMeasurementArrays[k] !== "undefined") {
                for (var j = 0; j < monthlyMeasurementArrays[k].length; j++) {
                    if (typeof sumByMonthly[k] === "undefined") {sumByMonthly[k] = 0;}
                    sumByMonthly[k] = sumByMonthly[k] + monthlyMeasurementArrays[k][j].value;
                }
                averageValueByMonthlyArray[k] = sumByMonthly[k] / (monthlyMeasurementArrays[k].length);
            } else {
                averageValueByMonthlyArray[k] = null;
                //console.debug("No data for day " + k);
            }
        }
        return averageValueByMonthlyArray;
    };
    var shouldWeUsePrimaryOutcomeLabels = function (variableObject) {
        return variableObject.userVariableDefaultUnitId === 10 && variableObject.name === quantimodoService.getPrimaryOutcomeVariable().name;
    };
    function setChartExportingOptions(chartConfig){
        chartConfig.options.exporting = {enabled: $rootScope.isWeb};
        return chartConfig;
    }
    quantimodoService.configureDistributionChart = function(dataAndLabels, variableObject){
        var xAxisLabels = [];
        var xAxisTitle = 'Daily Values (' + variableObject.userVariableDefaultUnitAbbreviatedName + ')';
        var data = [];
        if(shouldWeUsePrimaryOutcomeLabels(variableObject)){ data = [0, 0, 0, 0, 0]; }
        function isInt(n) { return parseFloat(n) % 1 === 0; }
        var dataAndLabels2 = [];
        for(var propertyName in dataAndLabels) {
            // propertyName is what you want
            // you can get the value like this: myObject[propertyName]
            if(dataAndLabels.hasOwnProperty(propertyName)){
                dataAndLabels2.push({label: propertyName, value: dataAndLabels[propertyName]});
                xAxisLabels.push(propertyName);
                if(shouldWeUsePrimaryOutcomeLabels(variableObject)){
                    if(isInt(propertyName)){ data[parseInt(propertyName) - 1] = dataAndLabels[propertyName]; }
                } else { data.push(dataAndLabels[propertyName]); }
            }
        }
        dataAndLabels2.sort(function(a, b) { return a.label - b.label; });
        xAxisLabels = [];
        data = [];
        for(var i = 0; i < dataAndLabels2.length; i++){
            xAxisLabels.push(dataAndLabels2[i].label);
            data.push(dataAndLabels2[i].value);
        }

        if(shouldWeUsePrimaryOutcomeLabels(variableObject)) {
            xAxisLabels = quantimodoService.getPrimaryOutcomeVariableOptionLabels();
            xAxisTitle = '';
        }
        var chartConfig = {
            options: {
                chart: {
                    height : 300,
                    type : 'column',
                    renderTo : 'BarContainer',
                    animation: {
                        duration: 0
                    }
                },
                title : {
                    text : variableObject.name + ' Distribution'
                },
                xAxis : {
                    title : {
                        text : xAxisTitle
                    },
                    categories : xAxisLabels
                },
                yAxis : {
                    title : {
                        text : 'Number of Measurements'
                    },
                    min : 0
                },
                lang: {
                    loading: ''
                },
                loading: {
                    style: {
                        background: 'url(/res/loading3.gif) no-repeat center'
                    },
                    hideDuration: 10,
                    showDuration: 10
                },
                legend : {
                    enabled : false
                },

                plotOptions : {
                    column : {
                        pointPadding : 0.2,
                        borderWidth : 0,
                        pointWidth : 40 * 5 / xAxisLabels.length,
                        enableMouseTracking : true,
                        colorByPoint : true
                    }
                },
                credits: {
                    enabled: false
                },
                colors : [ "#000000", "#5D83FF", "#68B107", "#ffbd40", "#CB0000" ]
            },
            series: [{
                name : variableObject.name + ' Distribution',
                data: data
            }]
        };
        return setChartExportingOptions(chartConfig);
    };
    quantimodoService.processDataAndConfigureWeekdayChart = function(measurements, variableObject) {
        if(!measurements){
            console.error('No measurements provided to processDataAndConfigureWeekdayChart');
            return false;
        }
        if(!variableObject.name){
            console.error("ERROR: No variable name provided to processDataAndConfigureWeekdayChart");
            return;
        }
        var weekdayMeasurementArray = this.generateWeekdayMeasurementArray(measurements);
        var averageValueByWeekdayArray = this.calculateAverageValueByWeekday(weekdayMeasurementArray);
        return this.configureWeekdayChart(averageValueByWeekdayArray, variableObject);
    };
    quantimodoService.processDataAndConfigureMonthlyChart = function(measurements, variableObject) {
        if(!measurements){
            console.error('No measurements provided to processDataAndConfigureMonthlyChart');
            return false;
        }
        if(!variableObject.name){
            console.error("ERROR: No variable name provided to processDataAndConfigureMonthlyChart");
            return;
        }
        var monthlyMeasurementArray = this.generateMonthlyMeasurementArray(measurements);
        var averageValueByMonthlyArray = this.calculateAverageValueByMonthly(monthlyMeasurementArray);
        return this.configureMonthlyChart(averageValueByMonthlyArray, variableObject);
    };
    quantimodoService.processDataAndConfigureHourlyChart = function(measurements, variableObject) {
        if(!variableObject.name){
            console.error("ERROR: No variable name provided to processDataAndConfigureHourlyChart");
            return;
        }
        var hourlyMeasurementArray = this.generateHourlyMeasurementArray(measurements);
        var count = 0;
        for(var i = 0; i < hourlyMeasurementArray.length; ++i){
            if(hourlyMeasurementArray[i]) {count++;}
        }
        if(variableObject.name.toLowerCase().indexOf('daily') !== -1){
            console.debug('Not showing hourly chart because variable name contains daily');
            return false;
        }
        if(count < 3){
            console.debug('Not showing hourly chart because we have less than 3 hours with measurements');
            return false;
        }
        var averageValueByHourArray = this.calculateAverageValueByHour(hourlyMeasurementArray);
        return this.configureHourlyChart(averageValueByHourArray, variableObject);
    };
    quantimodoService.processDataAndConfigureDistributionChart = function(measurements, variableObject) {
        if(!variableObject.name){
            console.error("ERROR: No variable name provided to processDataAndConfigureHourlyChart");
            return;
        }
        var distributionArray = this.generateDistributionArray(measurements);
        return this.configureDistributionChart(distributionArray, variableObject);
    };
    quantimodoService.configureWeekdayChart = function(averageValueByWeekdayArray, variableObject){
        if(!variableObject.name){
            console.error("ERROR: No variable name provided to configureWeekdayChart");
            return;
        }
        var maximum = 0;
        var minimum = 99999999999999999999999999999999;
        var xAxisLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        for(var i = 0; i < averageValueByWeekdayArray.length; i++){
            if(averageValueByWeekdayArray[i] > maximum){maximum = averageValueByWeekdayArray[i];}
            if(averageValueByWeekdayArray[i] < minimum){minimum = averageValueByWeekdayArray[i];}
        }
        var chartConfig = {
            options: {
                chart: {
                    height : 300,
                    type : 'column',
                    renderTo : 'BarContainer',
                    animation: {duration: 1000}
                },
                title : {text : 'Average  ' + variableObject.name + ' by Day of Week'},
                xAxis : {categories : xAxisLabels},
                yAxis : {
                    title : {text : 'Average Value (' + variableObject.userVariableDefaultUnitName + ')'},
                    min : minimum,
                    max : maximum
                },
                lang: {loading: ''},
                loading: {
                    style: {background: 'url(/res/loading3.gif) no-repeat center'},
                    hideDuration: 10,
                    showDuration: 10
                },
                legend : {enabled : false},
                plotOptions : {
                    column : {
                        pointPadding : 0.2,
                        borderWidth : 0,
                        pointWidth : 40 * 5 / xAxisLabels.length,
                        enableMouseTracking : true,
                        colorByPoint : true
                    }
                },
                credits: {enabled: false},
                colors : [ "#5D83FF", "#68B107", "#ffbd40", "#CB0000" ]
            },
            series: [{
                name : 'Average  ' + variableObject.name + ' by Day of Week',
                data: averageValueByWeekdayArray
            }]
        };
        return setChartExportingOptions(chartConfig);
    };
    quantimodoService.configureMonthlyChart = function(averageValueByMonthlyArray, variableObject){
        if(!variableObject.name){
            console.error("ERROR: No variable name provided to configureMonthlyChart");
            return;
        }
        var maximum = 0;
        var minimum = 99999999999999999999999999999999;
        var xAxisLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for(var i = 0; i < averageValueByMonthlyArray.length; i++){
            if(averageValueByMonthlyArray[i] > maximum){maximum = averageValueByMonthlyArray[i];}
            if(averageValueByMonthlyArray[i] < minimum){minimum = averageValueByMonthlyArray[i];}
        }
        var chartConfig = {
            options: {
                chart: {
                    height : 300,
                    type : 'column',
                    renderTo : 'BarContainer',
                    animation: {duration: 1000}
                },
                title : {text : 'Average  ' + variableObject.name + ' by Month'},
                xAxis : {categories : xAxisLabels},
                yAxis : {
                    title : {text : 'Average Value (' + variableObject.userVariableDefaultUnitName + ')'},
                    min : minimum,
                    max : maximum
                },
                lang: {loading: ''},
                loading: {
                    style: {background: 'url(/res/loading3.gif) no-repeat center'},
                    hideDuration: 10,
                    showDuration: 10
                },
                legend : {enabled : false},
                plotOptions : {
                    column : {
                        pointPadding : 0.2,
                        borderWidth : 0,
                        pointWidth : 40 * 5 / xAxisLabels.length,
                        enableMouseTracking : true,
                        colorByPoint : true
                    }
                },
                credits: {enabled: false},
                colors : [ "#5D83FF", "#68B107", "#ffbd40", "#CB0000" ]
            },
            series: [{
                name : 'Average  ' + variableObject.name + ' by Month',
                data: averageValueByMonthlyArray
            }]
        };
        return setChartExportingOptions(chartConfig);
    };
    quantimodoService.configureHourlyChart = function(averageValueByHourArray, variableObject){
        if(!variableObject.name){
            console.error("ERROR: No variable name provided to configureHourlyChart");
            return;
        }
        var maximum = 0;
        var minimum = 99999999999999999999999999999999;
        var xAxisLabels = [
            '12 AM',
            '1 AM',
            '2 AM',
            '3 AM',
            '4 AM',
            '5 AM',
            '6 AM',
            '7 AM',
            '8 AM',
            '9 AM',
            '10 AM',
            '11 AM',
            '12 PM',
            '1 PM',
            '2 PM',
            '3 PM',
            '4 PM',
            '5 PM',
            '6 PM',
            '7 PM',
            '8 PM',
            '9 PM',
            '10 PM',
            '11 PM'
        ];
        for(var i = 0; i < averageValueByHourArray.length; i++){
            if(averageValueByHourArray[i] > maximum){maximum = averageValueByHourArray[i];}
            if(averageValueByHourArray[i] < minimum){minimum = averageValueByHourArray[i];}
        }
        var chartConfig = {
            options: {
                chart: {
                    height : 300,
                    type : 'column',
                    renderTo : 'BarContainer',
                    animation: {
                        duration: 1000
                    }
                },
                title : {text : 'Average  ' + variableObject.name + ' by Hour of Day'},
                xAxis : {categories : xAxisLabels},
                yAxis : {
                    title : {text : 'Average Value (' + variableObject.userVariableDefaultUnitName + ')'},
                    min : minimum,
                    max : maximum
                },
                lang: {loading: ''},
                loading: {
                    style: {background: 'url(/res/loading3.gif) no-repeat center'},
                    hideDuration: 10,
                    showDuration: 10
                },
                legend : {enabled : false},
                plotOptions : {
                    column : {
                        pointPadding : 0.2,
                        borderWidth : 0,
                        pointWidth : 40 * 5 / xAxisLabels.length,
                        enableMouseTracking : true,
                        colorByPoint : true
                    }
                },
                credits: {enabled: false},
                colors : [ "#5D83FF", "#68B107", "#ffbd40", "#CB0000"]
            },
            series: [{
                name : 'Average  ' + variableObject.name + ' by Hour of Day',
                data: averageValueByHourArray
            }]
        };
        return setChartExportingOptions(chartConfig);
    };
    quantimodoService.processDataAndConfigureLineChart = function(measurements, variableObject) {
        if(!measurements || !measurements.length){
            console.warn('No measurements provided to quantimodoService.processDataAndConfigureLineChart');
            return false;
        }
        var lineChartData = [];
        var lineChartItem, name;
        var numberOfMeasurements = measurements.length;
        if(numberOfMeasurements > 1000){console.warn('Highstock cannot show tooltips because we have more than 100 measurements');}
        for (var i = 0; i < numberOfMeasurements; i++) {
            if(numberOfMeasurements < 1000){
                name = (measurements[i].sourceName) ? "(" + measurements[i].sourceName + ")" : '';
                if(measurements[i].note){name = measurements[i].note + " " + name;}
                lineChartItem = {x: measurements[i].startTimeEpoch * 1000, y: measurements[i].value, name: name};
            } else {
                lineChartItem = [measurements[i].startTimeEpoch * 1000, measurements[i].value];
            }
            lineChartData.push(lineChartItem);
        }
        return quantimodoService.configureLineChart(lineChartData, variableObject);
    };
    function calculateWeightedMovingAverage( array, weightedPeriod ) {
        var weightedArray = [];
        for( var i = 0; i <= array.length - weightedPeriod; i++ ) {
            var sum = 0;
            for( var j = 0; j < weightedPeriod; j++ ) {sum += array[ i + j ] * ( weightedPeriod - j );}
            weightedArray[i] = sum / (( weightedPeriod * ( weightedPeriod + 1 )) / 2 );
        }
        return weightedArray;
    }
    quantimodoService.processDataAndConfigureCorrelationsOverDurationsOfActionChart = function(correlations, weightedPeriod) {
        if(!correlations || !correlations.length){return false;}
        var forwardPearsonCorrelationSeries = {
            name : 'Pearson Correlation Coefficient',
            data : [],
            tooltip: {valueDecimals: 2}
        };
        var smoothedPearsonCorrelationSeries = {
            name : 'Smoothed Pearson Correlation Coefficient',
            data : [],
            tooltip: {valueDecimals: 2}
        };
        var forwardSpearmanCorrelationSeries = {
            name : 'Spearman Correlation Coefficient',
            data : [],
            tooltip: {valueDecimals: 2}
        };
        var qmScoreSeries = {
            name : 'QM Score',
            data : [],
            tooltip: {valueDecimals: 2}
        };
        var xAxis = [];
        var excludeSpearman = false;
        var excludeQmScoreSeries = false;
        for (var i = 0; i < correlations.length; i++) {
            xAxis.push('Day ' + correlations[i].durationOfAction/(60 * 60 * 24));
            forwardPearsonCorrelationSeries.data.push(correlations[i].correlationCoefficient);
            forwardSpearmanCorrelationSeries.data.push(correlations[i].forwardSpearmanCorrelationCoefficient);
            if(correlations[i].forwardSpearmanCorrelationCoefficient === null){excludeSpearman = true;}
            qmScoreSeries.data.push(correlations[i].qmScore);
            if(correlations[i].qmScore === null){excludeQmScoreSeries = true;}
        }
        var seriesToChart = [];
        seriesToChart.push(forwardPearsonCorrelationSeries);
        smoothedPearsonCorrelationSeries.data = calculateWeightedMovingAverage(forwardPearsonCorrelationSeries.data, weightedPeriod);
        seriesToChart.push(smoothedPearsonCorrelationSeries);
        if(!excludeSpearman){seriesToChart.push(forwardSpearmanCorrelationSeries);}
        if(!excludeQmScoreSeries){seriesToChart.push(qmScoreSeries);}
        var minimumTimeEpochMilliseconds = correlations[0].durationOfAction * 1000;
        var maximumTimeEpochMilliseconds = correlations[correlations.length - 1].durationOfAction * 1000;
        var millisecondsBetweenLatestAndEarliest = maximumTimeEpochMilliseconds - minimumTimeEpochMilliseconds;
        if(millisecondsBetweenLatestAndEarliest < 86400*1000){
            console.warn('Need at least a day worth of data for line chart');
            return;
        }
        var chartConfig = {
            title: {
                text: 'Correlations Over Durations of Action',
                //x: -20 //center
            },
            subtitle: {
                text: '',
                //text: 'Effect of ' + correlations[0].causeVariableName + ' on ' + correlations[0].effectVariableName + ' Over Time',
                //x: -20
            },
            legend : {enabled : false},
            xAxis: {
                title: {text: 'Assumed Duration Of Action'},
                categories: xAxis
            },
            yAxis: {
                title: {text: 'Value'},
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#EA4335'
                }]
            },
            tooltip: {valueSuffix: ''},
            series : seriesToChart
        };
        return chartConfig;
    };
    quantimodoService.processDataAndConfigureCorrelationsOverOnsetDelaysChart = function(correlations, weightedPeriod) {
        if(!correlations){return false;}
        var forwardPearsonCorrelationSeries = {
            name : 'Pearson Correlation Coefficient',
            data : [],
            tooltip: {valueDecimals: 2}
        };
        var smoothedPearsonCorrelationSeries = {
            name : 'Smoothed Pearson Correlation Coefficient',
            data : [],
            tooltip: {valueDecimals: 2}
        };
        var forwardSpearmanCorrelationSeries = {
            name : 'Spearman Correlation Coefficient',
            data : [],
            tooltip: {valueDecimals: 2}
        };
        var qmScoreSeries = {
            name : 'QM Score',
            data : [],
            tooltip: {valueDecimals: 2}
        };
        var xAxis = [];
        var excludeSpearman = false;
        var excludeQmScoreSeries = false;
        for (var i = 0; i < correlations.length; i++) {
            xAxis.push('Day ' + correlations[i].onsetDelay/(60 * 60 * 24));
            forwardPearsonCorrelationSeries.data.push(correlations[i].correlationCoefficient);
            forwardSpearmanCorrelationSeries.data.push(correlations[i].forwardSpearmanCorrelationCoefficient);
            if(correlations[i].forwardSpearmanCorrelationCoefficient === null){excludeSpearman = true;}
            qmScoreSeries.data.push(correlations[i].qmScore);
            if(correlations[i].qmScore === null){excludeQmScoreSeries = true;}
        }
        var seriesToChart = [];
        seriesToChart.push(forwardPearsonCorrelationSeries);
        smoothedPearsonCorrelationSeries.data = calculateWeightedMovingAverage(forwardPearsonCorrelationSeries.data, weightedPeriod);
        seriesToChart.push(smoothedPearsonCorrelationSeries);
        if(!excludeSpearman){seriesToChart.push(forwardSpearmanCorrelationSeries);}
        if(!excludeQmScoreSeries){seriesToChart.push(qmScoreSeries);}
        var minimumTimeEpochMilliseconds = correlations[0].onsetDelay * 1000;
        var maximumTimeEpochMilliseconds = correlations[correlations.length - 1].onsetDelay * 1000;
        var millisecondsBetweenLatestAndEarliest = maximumTimeEpochMilliseconds - minimumTimeEpochMilliseconds;
        if(millisecondsBetweenLatestAndEarliest < 86400*1000){
            console.warn('Need at least a day worth of data for line chart');
            return;
        }
        var config = {
            title: {
                text: 'Correlations Over Onset Delays',
                //x: -20 //center
            },
            subtitle: {
                text: '',
                //text: 'Effect of ' + correlations[0].causeVariableName + ' on ' + correlations[0].effectVariableName + ' Over Time',
                //x: -20
            },
            legend : {enabled : false},
            xAxis: {
                title: {text: 'Assumed Onset Delay'},
                categories: xAxis
            },
            yAxis: {
                title: {text: 'Value'},
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#EA4335'
                }]
            },
            tooltip: {valueSuffix: ''},
            series : seriesToChart
        };
        return config;
    };
    quantimodoService.processDataAndConfigurePairsOverTimeChart = function(pairs, correlationObject) {
        if(!pairs){return false;}
        var predictorSeries = {
            name : correlationObject.causeVariableName,
            data : [],
            tooltip: {valueDecimals: 2}
        };
        var outcomeSeries = {
            name : correlationObject.effectVariableName,
            data : [],
            tooltip: {valueDecimals: 2}
        };
        var xAxis = [];
        for (var i = 0; i < pairs.length; i++) {
            xAxis.push(moment(pairs[i].timestamp * 1000).format("ll"));
            predictorSeries.data.push(pairs[i].causeMeasurementValue);
            outcomeSeries.data.push(pairs[i].effectMeasurementValue);
        }
        var seriesToChart = [];
        seriesToChart.push(predictorSeries);
        seriesToChart.push(outcomeSeries);
        var minimumTimeEpochMilliseconds = pairs[0].timestamp * 1000;
        var maximumTimeEpochMilliseconds = pairs[pairs.length - 1].timestamp * 1000;
        var millisecondsBetweenLatestAndEarliest = maximumTimeEpochMilliseconds - minimumTimeEpochMilliseconds;
        if(millisecondsBetweenLatestAndEarliest < 86400*1000){
            console.warn('Need at least a day worth of data for line chart');
            return;
        }
        var config = {
            title: {
                text: 'Paired Data Over Time',
                //x: -20 //center
            },
            subtitle: {
                text: '',
                //text: 'Effect of ' + correlations[0].causeVariableName + ' on ' + correlations[0].effectVariableName + ' Over Time',
                //x: -20
            },
            legend : {enabled : false},
            xAxis: {
                title: {text: 'Date'},
                categories: xAxis
            },
            options: {
                yAxis: [{
                    lineWidth: 1,
                    title: {
                        text: correlationObject.causeVariableName + ' (' + correlationObject.causeVariableDefaultUnitAbbreviatedName + ')'
                    }
                }, {
                    lineWidth: 1,
                    opposite: true,
                    title: {
                        text: correlationObject.effectVariableName + ' (' + correlationObject.effectVariableDefaultUnitAbbreviatedName + ')'
                    }
                }]
            },
            tooltip: {valueSuffix: ''},
            series: [ {
                name: correlationObject.causeVariableName,
                type: 'spline',
                color: '#00A1F1',
                data: predictorSeries.data,
                marker: {
                    enabled: false
                },
                dashStyle: 'shortdot',
                tooltip: {valueSuffix: '' + correlationObject.causeVariableDefaultUnitAbbreviatedName}
            }, {
                name: correlationObject.effectVariableName,
                color: '#EA4335',
                type: 'spline',
                yAxis: 1,
                data: outcomeSeries.data,
                tooltip: {valueSuffix: '' + correlationObject.effectVariableDefaultUnitAbbreviatedName}
            }]
        };
        return config;
    };
    var calculatePearsonsCorrelation = function(xyValues) {
        var length = xyValues.length;
        var xy = [];
        var x2 = [];
        var y2 = [];
        $.each(xyValues,function(index,value){
            xy.push(value[0] * value[1]);
            x2.push(value[0] * value[0]);
            y2.push(value[1] * value[1]);
        });
        var sum_x = 0;
        var sum_y = 0;
        var sum_xy = 0;
        var sum_x2 = 0;
        var sum_y2 = 0;
        var i=0;
        $.each(xyValues,function(index,value){
            sum_x += value[0];
            sum_y += value[1];
            sum_xy += xy[i];
            sum_x2 += x2[i];
            sum_y2 += y2[i];
            i+=1;
        });
        var step1 = (length * sum_xy) - (sum_x * sum_y);
        var step2 = (length * sum_x2) - (sum_x * sum_x);
        var step3 = (length * sum_y2) - (sum_y * sum_y);
        var step4 = Math.sqrt(step2 * step3);
        var answer = step1 / step4;
        // check if answer is NaN, it can occur in the case of very small values
        return isNaN(answer) ? 0 : answer;
    };
    quantimodoService.createScatterPlot = function (correlationObject, pairs, title) {
        if(!pairs){
            console.warn('No pairs provided to quantimodoService.createScatterPlot');
            return false;
        }
        var xyVariableValues = [];
        for(var i = 0; i < pairs.length; i++ ){
            /** @namespace pairs[i].causeMeasurementValue */
            /** @namespace pairs[i].effectMeasurementValue */
            xyVariableValues.push([pairs[i].causeMeasurementValue, pairs[i].effectMeasurementValue]);
        }
        /** @namespace correlationObject.causeVariableDefaultUnitAbbreviatedName */
        /** @namespace correlationObject.effectVariableDefaultUnitAbbreviatedName */
        var chartConfig = {
            options: {
                chart: {
                    type: 'scatter',
                    zoomType: 'xy'
                },
                plotOptions: {
                    scatter: {
                        marker: {
                            radius: 5,
                            states: {
                                hover: {
                                    enabled: true,
                                    lineColor: 'rgb(100,100,100)'
                                }
                            }
                        },
                        states: {
                            hover: {
                                marker: {enabled: false}
                            }
                        },
                        tooltip: {
                            //headerFormat: '<b>{series.name}</b><br>',
                            pointFormat: '{point.x}' + correlationObject.causeVariableDefaultUnitAbbreviatedName + ', {point.y}' + correlationObject.effectVariableDefaultUnitAbbreviatedName
                        }
                    }
                },
                credits: {enabled: false}
            },
            xAxis: {
                title: {
                    enabled: true,
                    text: correlationObject.causeVariableName + ' (' + correlationObject.causeVariableDefaultUnitAbbreviatedName + ')'
                },
                startOnTick: true,
                endOnTick: true,
                showLastLabel: true
            },
            yAxis: {
                title: {text: correlationObject.effectVariableName + ' (' + correlationObject.effectVariableDefaultUnitAbbreviatedName + ')'}
            },
            series: [{
                name: correlationObject.effectVariableName + ' by ' + correlationObject.causeVariableName,
                color: 'rgba(223, 83, 83, .5)',
                data: xyVariableValues
            }],
            title: {text: title + ' (R = ' + calculatePearsonsCorrelation(xyVariableValues).toFixed(2) + ')'},
            subtitle: {text: ''},
            loading: false
        };
        return setChartExportingOptions(chartConfig);
    };
    quantimodoService.configureLineChartForCause  = function(correlationObject, pairs) {
        var variableObject = {unitAbbreviatedName: correlationObject.causeVariableDefaultUnitAbbreviatedName, name: correlationObject.causeVariableName};
        var data = [];
        for (var i = 0; i < pairs.length; i++) {data[i] = [pairs[i].timestamp * 1000, pairs[i].causeMeasurementValue];}
        return quantimodoService.configureLineChart(data, variableObject);
    };
    quantimodoService.configureLineChartForEffect  = function(correlationObject, pairs) {
        var variableObject = {unitAbbreviatedName: correlationObject.effectVariableDefaultUnitAbbreviatedName, name: correlationObject.effectVariableName};
        var data = [];
        for (var i = 0; i < pairs.length; i++) {data[i] = [pairs[i].timestamp * 1000, pairs[i].effectMeasurementValue];}
        return quantimodoService.configureLineChart(data, variableObject);
    };
    quantimodoService.configureLineChartForPairs = function(params, pairs) {
        var inputColor = '#26B14C', outputColor = '#3284FF', mixedColor = '#26B14C', linearRegressionColor = '#FFBB00';
        if(!params.causeVariableName){
            console.error("ERROR: No variable name provided to configureLineChart");
            return;
        }
        if(pairs.length < 1){
            console.error("ERROR: No data provided to configureLineChart");
            return;
        }
        var date = new Date();
        var timezoneOffsetHours = (date.getTimezoneOffset())/60;
        var timezoneOffsetMilliseconds = timezoneOffsetHours*60*60*1000; // minutes, seconds, milliseconds
        var causeSeries = [];
        var effectSeries = [];
        for (var i = 0; i < pairs.length; i++) {
            causeSeries[i] = [pairs[i].timestamp * 1000 - timezoneOffsetMilliseconds, pairs[i].causeMeasurementValue];
            effectSeries[i] = [pairs[i].timestamp * 1000 - timezoneOffsetMilliseconds, pairs[i].effectMeasurementValue];
        }
        var minimumTimeEpochMilliseconds = pairs[0].timestamp * 1000 - timezoneOffsetMilliseconds;
        var maximumTimeEpochMilliseconds = pairs[pairs.length-1].timestamp * 1000 - timezoneOffsetMilliseconds;
        var millisecondsBetweenLatestAndEarliest = maximumTimeEpochMilliseconds - minimumTimeEpochMilliseconds;
        if(millisecondsBetweenLatestAndEarliest < 86400 * 1000){
            console.warn('Need at least a day worth of data for line chart');
            return;
        }
        var tlSmoothGraph, tlGraphType; // Smoothgraph true = graphType spline
        var tlEnableMarkers;
        var tlEnableHorizontalGuides = 1;
        tlSmoothGraph = true;
        tlGraphType = tlSmoothGraph === true ? 'spline' : 'line'; // spline if smoothGraph = true
        tlEnableMarkers = true; // On by default
        return  {
            chart: {renderTo: 'timeline', zoomType: 'x'},
            title: {
                text: params.causeVariableName + ' & ' + params.effectVariableName + ' Over Time'
            },
            //subtitle: {text: 'Longitudinal Timeline' + resolution, useHTML: true},
            legend: {enabled: false},
            scrollbar: {
                barBackgroundColor: '#eeeeee',
                barBorderRadius: 0,
                barBorderWidth: 0,
                buttonBackgroundColor: '#eeeeee',
                buttonBorderWidth: 0,
                buttonBorderRadius: 0,
                trackBackgroundColor: 'none',
                trackBorderWidth: 0.5,
                trackBorderRadius: 0,
                trackBorderColor: '#CCC'
            },
            navigator: {
                adaptToUpdatedData: true,
                margin: 10,
                height: 50,
                handles: {
                    backgroundColor: '#eeeeee'
                }
            },
            xAxis: {
                type: 'datetime',
                gridLineWidth: false,
                dateTimeLabelFormats: {
                    millisecond: '%H:%M:%S.%L',
                    second: '%H:%M:%S',
                    minute: '%H:%M',
                    hour: '%H:%M',
                    day: '%e. %b',
                    week: '%e. %b',
                    month: '%b \'%y',
                    year: '%Y'
                },
                min: minimumTimeEpochMilliseconds,
                max: maximumTimeEpochMilliseconds
            },
            yAxis: [
                {
                    gridLineWidth: tlEnableHorizontalGuides,
                    title: {text: '', style: {color: inputColor}},
                    labels: {
                        formatter: function () {
                            return this.value;
                        }, style: {color: inputColor}
                    }
                },
                {
                    gridLineWidth: tlEnableHorizontalGuides,
                    title: {text: 'Data is coming down the pipes!', style: {color: outputColor}},
                    labels: {
                        formatter: function () {
                            return this.value;
                        }, style: {color: outputColor}
                    },
                    opposite: true
                }
            ],
            plotOptions: {
                series: {
                    lineWidth: 1,
                    states: {
                        hover: {
                            enabled: true,
                            lineWidth: 1.5
                        }
                    }
                }
            },
            series: [
                {
                    yAxis: 0,
                    name : params.causeVariableName + ' (' + pairs[0].causeVariableDefaultUnitAbbreviatedName + ')',
                    type: tlGraphType,
                    color: inputColor,
                    data: causeSeries,
                    marker: {enabled: tlEnableMarkers, radius: 3}
                },
                {
                    yAxis: 1,
                    name : params.effectVariableName + ' (' + pairs[0].effectVariableDefaultUnitAbbreviatedName + ')',
                    type: tlGraphType,
                    color: outputColor,
                    data: effectSeries,
                    marker: {enabled: tlEnableMarkers, radius: 3}
                }
            ],
            credits: {
                enabled: false
            },
            rangeSelector: {
                inputBoxWidth: 120,
                inputBoxHeight: 18
            }
        };
    };
    quantimodoService.configureLineChart = function(data, variableObject) {
        if(!variableObject.name){
            if(variableObject.variableName){
                variableObject.name = variableObject.variableName;
            } else {
                console.error("ERROR: No variable name provided to configureLineChart");
                return;
            }
        }
        if(data.length < 1){
            console.error("ERROR: No data provided to configureLineChart");
            return;
        }
        var date = new Date();
        var timezoneOffsetHours = (date.getTimezoneOffset())/60;
        var timezoneOffsetMilliseconds = timezoneOffsetHours*60*60*1000; // minutes, seconds, milliseconds
        var minimumTimeEpochMilliseconds, maximumTimeEpochMilliseconds, i;
        var numberOfMeasurements = data.length;
        if(numberOfMeasurements < 1000){
            data = data.sort(function(a, b){return a.x - b.x;});
            for (i = 0; i < numberOfMeasurements; i++) {data[i].x = data[i].x - timezoneOffsetMilliseconds;}
            minimumTimeEpochMilliseconds = data[0].x - timezoneOffsetMilliseconds;
            maximumTimeEpochMilliseconds = data[data.length-1].x - timezoneOffsetMilliseconds;
        } else {
            data = data.sort(function(a, b){return a[0] - b[0];});
            for (i = 0; i < numberOfMeasurements; i++) {data[i][0] = data[i][0] - timezoneOffsetMilliseconds;}
            minimumTimeEpochMilliseconds = data[0][0] - timezoneOffsetMilliseconds;
            maximumTimeEpochMilliseconds = data[data.length-1][0] - timezoneOffsetMilliseconds;
        }
        var millisecondsBetweenLatestAndEarliest = maximumTimeEpochMilliseconds - minimumTimeEpochMilliseconds;
        if(millisecondsBetweenLatestAndEarliest < 86400*1000){
            console.warn('Need at least a day worth of data for line chart');
            return;
        }
        var chartConfig = {
            useHighStocks: true,
            options : {
                //turboThreshold: 0, // DOESN'T SEEM TO WORK -Disables 1000 data point limitation http://api.highcharts.com/highcharts/plotOptions.series.turboThreshold
                tooltip: {
                    shared: true,
                    formatter: function(){
                        var value = this;
                        var string = '';
                        if(numberOfMeasurements < 1000) {
                            string += '<h3><b>' + moment(value.x).format("h A, dddd, MMM Do YYYY") + '<b></h3><br/>';
                        } else {
                            string += '<h3><b>' + moment(value.x).format("MMM Do YYYY") + '<b></h3><br/>';
                        }
                        angular.forEach(value.points,function(point){
                            //string += '<span>' + point.series.name + ':</span> ';
                            string += '<span>' + (point.point.y + variableObject.userVariableDefaultUnitAbbreviatedName).replace(' /', '/') + '</span>';
                            string += '<br/>';
                            if(value.points["0"].point.name){
                                string += '<span>' + value.points["0"].point.name + '</span>';
                                string += '<br/>';
                            }
                        });
                        return string;
                    },
                    useHtml: true
                },
                legend : {enabled : false},
                title: {text: variableObject.name + ' Over Time (' + variableObject.userVariableDefaultUnitAbbreviatedName + ')'},
                xAxis : {
                    type: 'datetime',
                    dateTimeLabelFormats : {
                        millisecond : '%I:%M %p',
                        second : '%I:%M %p',
                        minute: '%I:%M %p',
                        hour: '%I %p',
                        day: '%e. %b',
                        week: '%e. %b',
                        month: '%b \'%y',
                        year: '%Y'
                    },
                    min: minimumTimeEpochMilliseconds,
                    max: maximumTimeEpochMilliseconds
                },
                credits: {enabled: false},
                rangeSelector: {enabled: true},
                navigator: {
                    enabled: true,
                    xAxis: {
                        type : 'datetime',
                        dateTimeLabelFormats : {
                            millisecond : '%I:%M %p',
                            second : '%I:%M %p',
                            minute: '%I:%M %p',
                            hour: '%I %p',
                            day: '%e. %b',
                            week: '%e. %b',
                            month: '%b \'%y',
                            year: '%Y'
                        }
                    }
                }
            },
            series :[{
                name : variableObject.name + ' Over Time',
                data : data,
                tooltip: {valueDecimals: 2}
            }]
        };
        var doNotConnectPoints = variableObject.userVariableDefaultUnitCategoryName !== 'Rating';
        if(doNotConnectPoints){
            chartConfig.series.marker = {enabled: true, radius: 2};
            chartConfig.series.lineWidth = 0;
            chartConfig.series.states = {hover: {lineWidthPlus: 0}};
        }
        return setChartExportingOptions(chartConfig);
    };

    // VARIABLE SERVICE
    // get user variables (without public)
    quantimodoService.searchUserVariablesDeferred = function(variableSearchQuery, params){
        var deferred = $q.defer();
        if(!variableSearchQuery){ variableSearchQuery = '*'; }
        quantimodoService.searchUserVariablesFromApi(variableSearchQuery, params, function(variables){
            deferred.resolve(variables);
        }, function(error){
            console.error(JSON.stringify(error));
            deferred.reject(error);
        });
        return deferred.promise;
    };
    function doWeHaveEnoughVariables(variables){
        var numberOfMatchingLocalVariablesRequiredToSkipAPIRequest = 2;
        return variables && variables.length > numberOfMatchingLocalVariablesRequiredToSkipAPIRequest;  //Do API search if only 1 local result because I can't get "Remeron" because I have "Remeron Powder" locally
    }
    function doWeHaveExactMatch(variables, variableSearchQuery){
        return quantimodoService.arrayHasItemWithNameProperty(variables) && variables[0].name.toLowerCase() === variableSearchQuery.toLowerCase(); // No need for API request if we have exact match
    }
    function shouldWeMakeVariablesSearchAPIRequest(variables, variableSearchQuery){
        var haveEnough = doWeHaveEnoughVariables(variables);
        var exactMatch = doWeHaveExactMatch(variables, variableSearchQuery);
        return !haveEnough && !exactMatch;
    }
    // get user variables (without public)
    quantimodoService.searchVariablesIncludingLocalDeferred = function(variableSearchQuery, params){
        var deferred = $q.defer();
        var variables = quantimodoService.searchLocalStorage('userVariables', 'name', variableSearchQuery, params);
        if(params.includePublic){
            if(!variables){variables = [];}
            var commonVariables = quantimodoService.searchLocalStorage('commonVariables', 'name', variableSearchQuery, params);
            variables = variables.concat(commonVariables);
        }
        if(!shouldWeMakeVariablesSearchAPIRequest(variables, variableSearchQuery)) {
            deferred.resolve(variables);
            return deferred.promise;
        }
        if(!variableSearchQuery){ variableSearchQuery = '*'; }
        quantimodoService.searchUserVariablesFromApi(variableSearchQuery, params, function(variables){
            deferred.resolve(variables);
        }, function(error){
            console.error(JSON.stringify(error));
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.refreshUserVariableByNameDeferred = function (variableName) {
        var deferred = $q.defer();
        var params = {includeTags : true};
        quantimodoService.getVariablesByNameFromApi(variableName, params, function(variable){
            deferred.resolve(variable);
        }, function(error){ deferred.reject(error); });
        return deferred.promise;
    };
    quantimodoService.getVariablesFromLocalStorage = function(requestParams){
        var variables;
        if(!variables){ variables = JSON.parse(quantimodoService.getLocalStorageItemAsString('userVariables')); }
        if(requestParams.includePublic){
            if(!variables){variables = [];}
            var commonVariables = JSON.parse(quantimodoService.getLocalStorageItemAsString('commonVariables'));
            if(commonVariables && commonVariables.constructor === Array){
                variables = variables.concat(commonVariables);
            } else {
                quantimodoService.reportErrorDeferred("commonVariables from localStorage is not an array!  commonVariables.json didn't load for some reason!");
                quantimodoService.putCommonVariablesInLocalStorage();
            }
        }
        variables = quantimodoService.removeArrayElementsWithDuplicateIds(variables);
        if(requestParams && requestParams.sort){variables = quantimodoService.sortByProperty(variables, requestParams.sort);}
        //variables = addVariableCategoryInfo(variables);
        return variables;
    };
    quantimodoService.getUserVariableByNameFromLocalStorageOrApiDeferred = function(name, params, refresh){
        var deferred = $q.defer();
        quantimodoService.getLocalStorageItemAsStringWithCallback('userVariables', function (userVariables) {
            if(!refresh && userVariables){
                userVariables = JSON.parse(userVariables);
                for(var i = 0; i < userVariables.length; i++){
                    if(userVariables[i].name === name){
                        deferred.resolve(userVariables[i]);
                        return;
                    }
                }
            }
            quantimodoService.getVariablesByNameFromApi(name, params, function(variable){
                quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('userVariables', variable);
                deferred.resolve(variable);
            }, function(error){ deferred.reject(error); });
        });
        return deferred.promise;
    };
    quantimodoService.addWikipediaExtractAndThumbnail = function(variableObject){
        quantimodoService.getWikipediaArticle(variableObject.name).then(function (page) {
            if(page){
                variableObject.wikipediaExtract = page.extract;
                if(page.thumbnail){ variableObject.imageUrl = page.thumbnail; }
            }
        });
    };
    // post changes to user variable settings
    quantimodoService.postUserVariableDeferred = function(body) {
        var deferred = $q.defer();
        quantimodoService.postUserVariableToApi(body, function(response) {
            quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('userVariables', response.userVariable);
            quantimodoService.deleteItemFromLocalStorage('lastStudy');
            $rootScope.variableObject = response.userVariable;
            //quantimodoService.addWikipediaExtractAndThumbnail($rootScope.variableObject);
            console.debug("quantimodoService.postUserVariableDeferred: success: " + JSON.stringify(response.userVariable));
            deferred.resolve(response.userVariable);
        }, function(error){ deferred.reject(error); });
        return deferred.promise;
    };
    quantimodoService.resetUserVariableDeferred = function(variableId) {
        var deferred = $q.defer();
        var body = {variableId: variableId};
        quantimodoService.resetUserVariable(body, function(response) {
            quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('userVariables', response.data.userVariable);
            deferred.resolve(response.data.userVariable);
        }, function(error){  deferred.reject(error); });
        return deferred.promise;
    };
    quantimodoService.getVariableByIdDeferred = function(variableId){
        var deferred = $q.defer();
        // refresh always
        quantimodoService.getVariableByIdFromApi(variableId, function(variable){
            deferred.resolve(variable);
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.deleteAllMeasurementsForVariableDeferred = function(variableId) {
        var deferred = $q.defer();
        quantimodoService.deleteUserVariableMeasurements(variableId, function() {
            // Delete user variable from local storage
            quantimodoService.deleteElementOfLocalStorageItemById('userVariables', variableId);
            deferred.resolve();
        }, function(error) {
            if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, JSON.stringify(error), {}, "error"); }
            console.error('Error deleting all measurements for variable: ', error);
            deferred.reject(error);
        });
        return deferred.promise;
    };
    quantimodoService.getUserVariablesFromLocalStorageOrApiDeferred = function(params){
        var deferred = $q.defer();
        var userVariables = quantimodoService.getElementsFromLocalStorageItemWithRequestParams('userVariables', params);
        if(userVariables && userVariables.length){
            deferred.resolve(userVariables);
            return deferred.promise;
        }
        if(quantimodoService.getLocalStorageItemAsString('userVariables') === "[]"){
            deferred.resolve([]);
            return deferred.promise;
        }
        userVariables = JSON.parse(quantimodoService.getLocalStorageItemAsString('userVariables'));
        if(userVariables && userVariables.length){
            console.debug("We already have userVariables that didn't match filters so no need to refresh them");
            deferred.resolve([]);
            return deferred.promise;
        }
        quantimodoService.refreshUserVariables().then(function () {
            userVariables = quantimodoService.getElementsFromLocalStorageItemWithRequestParams('userVariables', params);
            deferred.resolve(userVariables);
        }, function (error) {deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.refreshUserVariables = function(){
        var deferred = $q.defer();
        quantimodoService.getUserVariablesFromApi({limit: 200, sort: "-latestMeasurementTime"}, function(userVariables){
            quantimodoService.setLocalStorageItem('userVariables', JSON.stringify(userVariables));
            deferred.resolve(userVariables);
        }, function(error){deferred.reject(error);});
        return deferred.promise;
    };
    quantimodoService.getCommonVariablesDeferred = function(params){
        var deferred = $q.defer();
        var commonVariables = quantimodoService.getElementsFromLocalStorageItemWithRequestParams('commonVariables', params);
        if(!commonVariables || !commonVariables.length){
            quantimodoService.putCommonVariablesInLocalStorage().then(function (commonVariables) {deferred.resolve(commonVariables);});
        } else {
            deferred.resolve(commonVariables);
        }
        return deferred.promise;
    };
    quantimodoService.putCommonVariablesInLocalStorage = function(){
        var deferred = $q.defer();
        $http.get('data/commonVariables.json').success(function(commonVariables) { // Generated in `gulp configureAppAfterNpmInstall` with `gulp getCommonVariables`
            if(commonVariables.constructor !== Array){
                quantimodoService.reportErrorDeferred('commonVariables.json is not present!');
                deferred.reject('commonVariables.json is not present!');
            } else {
                quantimodoService.setLocalStorageItem('commonVariables', JSON.stringify(commonVariables));
                deferred.resolve(commonVariables);
            }
        });
        return deferred.promise;
    };

    // NOTIFICATION SERVICE
    function createChromeAlarmNameFromTrackingReminder(trackingReminder) {
        return {
            trackingReminderId: trackingReminder.id,
            variableName: trackingReminder.variableName,
            defaultValue: trackingReminder.defaultValue,
            unitAbbreviatedName: trackingReminder.unitAbbreviatedName,
            periodInMinutes: trackingReminder.reminderFrequency / 60,
            reminderStartTime: trackingReminder.reminderStartTime,
            startTrackingDate: trackingReminder.startTrackingDate,
            variableCategoryName: trackingReminder.variableCategoryName,
            valence: trackingReminder.valence,
            reminderEndTime: trackingReminder.reminderEndTime
        };
    }
    quantimodoService.shouldWeUseIonicLocalNotifications = function(){
        $ionicPlatform.ready(function () {
            if (!config.appSettings.appDesign.cordovaLocalNotificationsEnabled || typeof cordova === "undefined" ||
                typeof cordova.plugins.notification === "undefined") {
                if (typeof cordova !== "undefined") {
                    if(typeof cordova.plugins !== "undefined" && typeof cordova.plugins.notification !== "undefined") {
                        cordova.plugins.notification.local.cancelAll(function () {
                            console.debug('cancelAllNotifications: notifications have been cancelled');
                            cordova.plugins.notification.local.getAll(function (notifications) {
                                console.debug("cancelAllNotifications: All notifications after cancelling", notifications);
                            });
                        });
                    }
                }
                console.debug('cordova.plugins.notification is not defined');
                return false;
            }
            return true;
        });
    };
    quantimodoService.setOnUpdateActionForLocalNotifications = function(){
        var deferred = $q.defer();
        if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {
            deferred.resolve();
            return deferred.promise;
        }
        cordova.plugins.notification.local.on("update", function(notification) {
            console.debug("onUpdate: Just updated this notification: ", notification);
            cordova.plugins.notification.local.getAll(function (notifications) {
                console.debug("onUpdate: All notifications after update: ", notifications);
            });
        });
        deferred.resolve();
        return deferred.promise;
    };
    quantimodoService.setOnClickActionForLocalNotifications = function(quantimodoService) {
        var deferred = $q.defer();
        if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {
            deferred.resolve();
            return deferred.promise;
        }
        var params = {};
        var locationTrackingNotificationId = 666;
        cordova.plugins.notification.local.on("click", function (notification) {
            console.debug("onClick: notification: ", notification);
            var notificationData = null;
            if(notification && notification.data){
                notificationData = JSON.parse(notification.data);
                console.debug("onClick: notification.data : ", notificationData);
            } else {console.debug("onClick: No notification.data provided");}
            if(notification.id !== locationTrackingNotificationId){
                /** @namespace cordova.plugins.notification */
                cordova.plugins.notification.local.clearAll(function () {console.debug("onClick: clearAll active notifications");}, this);
            }
            if(notificationData && notificationData.trackingReminderNotificationId){
                console.debug("onClick: Notification was a reminder notification not reminder.  " +
                    "Skipping notification with id: " + notificationData.trackingReminderNotificationId);
                params = {trackingReminderNotificationId: notificationData.trackingReminderNotificationId};
            } else if (notificationData && notificationData.id) {
                console.debug("onClick: Notification was a reminder not a reminder notification.  " +
                    "Skipping next notification for reminder id: " + notificationData.id);
                params = {trackingReminderId: notificationData.id};
            } else {
                console.debug("onClick: No notification data provided. Going to remindersInbox page.");
                $state.go('app.remindersInbox');
            }
            if(params.trackingReminderId || params.trackingReminderNotificationId ){
                quantimodoService.skipTrackingReminderNotification(params, function(response){
                    console.debug(response);
                }, function(error){
                    console.error(JSON.stringify(error));
                    if (typeof Bugsnag !== "undefined") {Bugsnag.notify(error, JSON.stringify(error), {}, "error");}
                });
                console.debug("onClick: Notification data provided. Going to addMeasurement page. Data: ", notificationData);
                //quantimodoService.decrementNotificationBadges();
                $state.go('app.measurementAdd', {reminderNotification: notificationData, fromState: 'app.remindersInbox'});
            } else {
                console.debug("onClick: No params.trackingReminderId || params.trackingReminderNotificationId. " +
                    "Should have already gone to remindersInbox page.");
            }
        });
        deferred.resolve();
        return deferred.promise;
    };
    quantimodoService.updateBadgesAndTextOnAllNotifications = function () {
        var deferred = $q.defer();
        if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {
            deferred.resolve();
            return deferred.promise;
        }
        if($rootScope.isIOS){
            console.warn("updateBadgesAndTextOnAllNotifications: updating notifications on iOS might make duplicates");
            //return;
        }
        $ionicPlatform.ready(function () {
            if(!$rootScope.numberOfPendingNotifications){$rootScope.numberOfPendingNotifications = 0;}
            cordova.plugins.notification.local.getAll(function (notifications) {
                console.debug("onTrigger.updateBadgesAndTextOnAllNotifications: " + "All notifications ", notifications);
                for (var i = 0; i < notifications.length; i++) {
                    if(notifications[i].badge === $rootScope.numberOfPendingNotifications){
                        console.warn("updateBadgesAndTextOnAllNotifications: Not updating notification because $rootScope.numberOfPendingNotifications" +
                            " === notifications[i].badge", notifications[i]);
                        continue;
                    }
                    console.debug('onTrigger.updateBadgesAndTextOnAllNotifications' + ':Updating notification', notifications[i]);
                    var notificationSettings = {
                        id: notifications[i].id,
                        badge: $rootScope.numberOfPendingNotifications,
                        title: "Time to track!",
                        text: "Add a tracking reminder!"
                    };
                    if($rootScope.numberOfPendingNotifications > 0){
                        notificationSettings.text = $rootScope.numberOfPendingNotifications + " tracking reminder notifications";
                    }
                    cordova.plugins.notification.local.update(notificationSettings);
                }
                deferred.resolve();
            });
        });
        return deferred.promise;
    };
    quantimodoService.setOnTriggerActionForLocalNotifications = function() {
        var deferred = $q.defer();
        if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {
            deferred.resolve();
            return deferred.promise;
        }
        function getNotificationsFromApiAndClearOrUpdateLocalNotifications() {
            var currentDateTimeInUtcStringPlus5Min = quantimodoService.getCurrentDateTimeInUtcStringPlusMin(5);
            var params = {reminderTime: '(lt)' + currentDateTimeInUtcStringPlus5Min};
            quantimodoService.getTrackingReminderNotificationsFromApi(params, function (response) {
                if (response.success) {
                    if(response.data.length > 1){
                        var trackingReminderNotifications = putTrackingReminderNotificationsInLocalStorageAndUpdateInbox(response.data);
                    }
                    /** @namespace window.chrome */
                    /** @namespace window.chrome.browserAction */
                    if (window.chrome && window.chrome.browserAction) {
                        chrome.browserAction.setBadgeText({text: "?"});
                        //chrome.browserAction.setBadgeText({text: String($rootScope.numberOfPendingNotifications)});
                    }
                    if (!$rootScope.numberOfPendingNotifications) {
                        if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {return;}
                        console.debug("onTrigger.getNotificationsFromApiAndClearOrUpdateLocalNotifications: No notifications from API so clearAll active notifications");
                        cordova.plugins.notification.local.clearAll(function () {
                            console.debug("onTrigger.getNotificationsFromApiAndClearOrUpdateLocalNotifications: cleared all active notifications");
                        }, this);
                    } else {$rootScope.updateOrRecreateNotifications();}
                }
            }, function(error) {
                if (typeof Bugsnag !== "undefined") {Bugsnag.notify(error, JSON.stringify(error), {}, "error");}
            });
        }
        function clearOtherLocalNotifications(currentNotification) {
            console.debug("onTrigger.clearOtherLocalNotifications: Clearing notifications except the one " +
                "that just triggered...");
            $ionicPlatform.ready(function () {
                cordova.plugins.notification.local.getTriggeredIds(function (triggeredNotifications) {
                    console.debug("onTrigger.clearOtherLocalNotifications: found triggered notifications " +
                        "before removing current one: " + JSON.stringify(triggeredNotifications));
                    if (triggeredNotifications.length < 1) {
                        console.warn("onTrigger.clearOtherLocalNotifications: Triggered notifications is " +
                            "empty so maybe it's not working.");
                    } else {
                        triggeredNotifications.splice(triggeredNotifications.indexOf(currentNotification.id), 1);
                        console.debug("onTrigger.clearOtherLocalNotifications: found triggered notifications " +
                            "after removing current one: " + JSON.stringify(triggeredNotifications));
                        cordova.plugins.notification.local.clear(triggeredNotifications);
                    }
                });
            });
        }
        function clearNotificationIfOutsideAllowedTimes(notificationData, currentNotification) {
            console.debug("onTrigger.clearNotificationIfOutsideAllowedTimes: Checking notification time limits",
                currentNotification);
            if (notificationData.reminderFrequency < 86400) {
                var currentTimeInLocalString = quantimodoService.getCurrentTimeInLocalString();
                var reminderStartTimeInLocalString = quantimodoService.getLocalTimeStringFromUtcString(notificationData.reminderStartTime);
                var reminderEndTimeInLocalString = quantimodoService.getLocalTimeStringFromUtcString(notificationData.reminderEndTime);
                if (currentTimeInLocalString < reminderStartTimeInLocalString) {
                    $ionicPlatform.ready(function () {
                        cordova.plugins.notification.local.clear(currentNotification.id, function (currentNotification) {
                            console.debug("onTrigger: Cleared notification because current time " +
                                currentTimeInLocalString + " is before reminder start time" + reminderStartTimeInLocalString, currentNotification);
                        });
                    });
                }
                if (currentTimeInLocalString > reminderEndTimeInLocalString) {
                    $ionicPlatform.ready(function () {
                        cordova.plugins.notification.local.clear(currentNotification.id, function (currentNotification) {
                            console.debug("onTrigger: Cleared notification because current time " +
                                currentTimeInLocalString + " is before reminder start time" + reminderStartTimeInLocalString, currentNotification);
                        });
                    });
                }
            }
        }
        cordova.plugins.notification.local.on("trigger", function (currentNotification) {

            /*                   I don't think this is necessary because we're going to check the API anyway
             if(currentNotification.badge < 1){
             $ionicPlatform.ready(function () {
             cordova.plugins.notification.local.clearAll(function () {
             console.warn("onTrigger: Cleared all notifications because badge is less than 1");
             });
             });
             return;
             }
             */
            try {
                quantimodoService.updateLocationVariablesAndPostMeasurementIfChanged();
                console.debug("onTrigger: just triggered this notification: ",  currentNotification);
                var notificationData = null;
                if(currentNotification && currentNotification.data){
                    notificationData = JSON.parse(currentNotification.data);
                    console.debug("onTrigger: notification.data : ", notificationData);
                    clearNotificationIfOutsideAllowedTimes(notificationData, currentNotification);
                } else {console.debug("onTrigger: No notification.data provided");}
                if(!notificationData){
                    console.debug("onTrigger: This is a generic notification that sends to inbox, so we'll check the API for pending notifications.");
                    getNotificationsFromApiAndClearOrUpdateLocalNotifications();
                }
                clearOtherLocalNotifications(currentNotification);
            } catch (exception) { if (typeof Bugsnag !== "undefined") { Bugsnag.notifyException(exception); }
                console.error('onTrigger error');
                if (typeof Bugsnag !== "undefined") { Bugsnag.notifyException(exception); }
            }
        });
        deferred.resolve();
        return deferred.promise;
    };
    quantimodoService.decrementNotificationBadges = function(){
        if($rootScope.numberOfPendingNotifications > 0){
            if (window.chrome && window.chrome.browserAction) {
                //noinspection JSUnresolvedFunction
                chrome.browserAction.setBadgeText({text: "?"});
                //chrome.browserAction.setBadgeText({text: String($rootScope.numberOfPendingNotifications)});
            }
            this.updateOrRecreateNotifications();
        }
    };
    quantimodoService.setNotificationBadge = function(numberOfPendingNotifications){
        console.debug("setNotificationBadge: numberOfPendingNotifications is " + numberOfPendingNotifications);
        $rootScope.numberOfPendingNotifications = numberOfPendingNotifications;
        if (window.chrome && window.chrome.browserAction) {
            chrome.browserAction.setBadgeText({text: "?"});
            //chrome.browserAction.setBadgeText({text: String($rootScope.numberOfPendingNotifications)});
        }
        this.updateOrRecreateNotifications();
    };
    quantimodoService.updateOrRecreateNotifications = function() {
        var deferred = $q.defer();
        if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {
            deferred.resolve();
            return deferred.promise;
        }
        if($rootScope.isAndroid){
            console.debug("updateOrRecreateNotifications: Updating notifications for Android because Samsung limits number of notifications " +
                "that can be scheduled in a day.");
            this.updateBadgesAndTextOnAllNotifications();
            deferred.resolve();
        }
        if($rootScope.isIOS){
            console.warn('updateOrRecreateNotifications: Updating local notifications on iOS might ' +
                'make duplicates and we cannot recreate here because we will lose the previously set interval');
            this.updateBadgesAndTextOnAllNotifications();
            deferred.resolve();
            //console.debug("updateOrRecreateNotifications: iOS makes duplicates when updating for some reason so we just cancel all and schedule again");
            //this.scheduleGenericNotification(notificationSettings);
        }
        return deferred.promise;
    };
    quantimodoService.scheduleSingleMostFrequentNotification = function(trackingRemindersFromApi) {
        if($rootScope.user.combineNotifications === false){
            console.warn("scheduleSingleMostFrequentNotification: $rootScope.user.combineNotifications === false" +
                " so we shouldn't be calling this function");
            return;
        }
        var shortestInterval = 86400;
        var at = new Date(0); // The 0 there is the key, which sets the date to the epoch
        if($rootScope.isChromeExtension || $rootScope.isIOS || $rootScope.isAndroid) {
            for (var i = 0; i < trackingRemindersFromApi.length; i++) {
                if(trackingRemindersFromApi[i].reminderFrequency < shortestInterval){
                    shortestInterval = trackingRemindersFromApi[i].reminderFrequency;
                    at.setUTCSeconds(trackingRemindersFromApi[i].nextReminderTimeEpochSeconds);
                }
            }
            var notificationSettings = {every: shortestInterval/60, at: at};
            if($rootScope.previousSingleNotificationSettings && notificationSettings === $rootScope.previousSingleNotificationSettings){
                console.debug("scheduleSingleMostFrequentNotification: Notification settings haven't changed so" +
                    " no need to scheduleGenericNotification", notificationSettings);
                return;
            }
            console.debug("scheduleSingleMostFrequentNotification: Going to schedule generic notification", notificationSettings);
            $rootScope.previousSingleNotificationSettings = notificationSettings;
            this.scheduleGenericNotification(notificationSettings);
        }
    };
    quantimodoService.scheduleAllNotificationsByTrackingReminders = function(trackingRemindersFromApi) {
        if($rootScope.isChromeExtension || $rootScope.isIOS || $rootScope.isAndroid) {
            for (var i = 0; i < trackingRemindersFromApi.length; i++) {
                if($rootScope.user.combineNotifications === false){
                    try {this.scheduleNotificationByReminder(trackingRemindersFromApi[i]);
                    } catch (exception) { if (typeof Bugsnag !== "undefined") { Bugsnag.notifyException(exception); }
                        console.error('scheduleAllNotificationsByTrackingReminders error');
                    }
                }
            }
            this.cancelNotificationsForDeletedReminders(trackingRemindersFromApi);
        }
    };
    quantimodoService.cancelNotificationsForDeletedReminders = function(trackingRemindersFromApi) {
        var deferred = $q.defer();
        function cancelChromeExtensionNotificationsForDeletedReminders(trackingRemindersFromApi) {
            /** @namespace chrome.alarms */
            chrome.alarms.getAll(function(scheduledTrackingReminders) {
                for (var i = 0; i < scheduledTrackingReminders.length; i++) {
                    var existingReminderFoundInApiResponse = false;
                    for (var j = 0; j < trackingRemindersFromApi.length; j++) {
                        var alarmName = createChromeAlarmNameFromTrackingReminder(trackingRemindersFromApi[j]);
                        if (JSON.stringify(alarmName) === scheduledTrackingReminders[i].name) {
                            console.debug('Server has a reminder matching alarm ' + JSON.stringify(scheduledTrackingReminders[i]));
                            existingReminderFoundInApiResponse = true;
                        }
                    }
                    if(!existingReminderFoundInApiResponse) {
                        console.debug('No api reminder found matching so cancelling this alarm ', JSON.stringify(scheduledTrackingReminders[i]));
                        chrome.alarms.clear(scheduledTrackingReminders[i].name);
                    }
                }
            });
        }
        function cancelIonicNotificationsForDeletedReminders(trackingRemindersFromApi) {
            if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {return;}
            cordova.plugins.notification.local.getAll(function (scheduledNotifications) {
                console.debug("cancelIonicNotificationsForDeletedReminders: notification.local.getAll " +
                    "scheduledNotifications: ",
                    scheduledNotifications);
                for (var i = 0; i < scheduledNotifications.length; i++) {
                    var existingReminderFoundInApiResponse = false;
                    for (var j = 0; j < trackingRemindersFromApi.length; j++) {
                        /** @namespace scheduledNotifications[i].id */
                        if (trackingRemindersFromApi[j].id === scheduledNotifications[i].id) {
                            console.debug('Server returned a reminder matching' + trackingRemindersFromApi[j]);
                            existingReminderFoundInApiResponse = true;
                        }
                    }
                    if(!existingReminderFoundInApiResponse) {
                        console.debug('Matching API reminder not found. Cancelling scheduled notification ' + JSON.stringify(scheduledNotifications[i]));
                        cordova.plugins.notification.local.cancel(scheduledNotifications[i].id, function (cancelledNotification) {
                            console.debug("Canceled notification ", cancelledNotification);
                        });
                    }
                }
            });
        }
        if ($rootScope.isChromeExtension || $rootScope.isChromeApp) {
            cancelChromeExtensionNotificationsForDeletedReminders(trackingRemindersFromApi);
        }
        $ionicPlatform.ready(function () {
            if (typeof cordova !== "undefined") {
                console.debug('cancelIonicNotificationsForDeletedReminders');
                cancelIonicNotificationsForDeletedReminders(trackingRemindersFromApi);
            }
            deferred.resolve();
        });
        return deferred.promise;
    };
    quantimodoService.scheduleNotificationByReminder = function(trackingReminder){
        if($rootScope.user.combineNotifications === true){
            console.warn("Not going to scheduleNotificationByReminder because $rootScope.user.combineNotifications === true");
            return;
        }
        if(!$rootScope.user.earliestReminderTime){
            console.error("Cannot schedule notifications because $rootScope.user.earliestReminderTime not set",
                $rootScope.user);
            return;
        }
        if(!$rootScope.user.latestReminderTime){
            console.error("Cannot schedule notifications because $rootScope.user.latestReminderTime not set",
                $rootScope.user);
            return;
        }
        function createOrUpdateIonicNotificationForTrackingReminder(notificationSettings) {
            var deferred = $q.defer();
            if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {
                deferred.resolve();
                return deferred.promise;
            }
            cordova.plugins.notification.local.isPresent(notificationSettings.id, function (present) {
                if (!present) {
                    console.debug("createOrUpdateIonicNotificationForTrackingReminder: Creating notification " +
                        "because not already set for " + JSON.stringify(notificationSettings));
                    cordova.plugins.notification.local.schedule(notificationSettings,
                        function () {
                            console.debug('createOrUpdateIonicNotificationForTrackingReminder: notification ' + 'scheduled', notificationSettings);
                        });
                }
                if (present) {
                    console.debug('createOrUpdateIonicNotificationForTrackingReminder: Updating notification', notificationSettings);
                    cordova.plugins.notification.local.update(notificationSettings,
                        function () {
                            console.debug('createOrUpdateIonicNotificationForTrackingReminder: ' + 'notification updated', notificationSettings);
                        });
                }
                deferred.resolve();
            });
            return deferred.promise;
        }
        function scheduleAndroidNotificationByTrackingReminder(trackingReminder) {
            var notificationSettings = {
                autoClear: true,
                color: undefined,
                data: trackingReminder,
                led: undefined,
                sound: "file://sound/silent.ogg",
                ongoing: false,
                title: "Track " + trackingReminder.variableName,
                text: "Tap to record measurement",
                ionIcon: 'ic_stat_icon_bw',
                id: trackingReminder.id
            };
            if($rootScope.numberOfPendingNotifications){
                notificationSettings.badge = 1; // Less stressful
                //notificationSettings.badge = $rootScope.numberOfPendingNotifications;
            }
            var dayInMinutes = 24 * 60;
            notificationSettings.every = dayInMinutes;
            console.debug("Trying to create Android notification for " + JSON.stringify(notificationSettings));
            //notificationSettings.sound = "res://platform_default";
            //notificationSettings.smallIcon = 'ic_stat_icon_bw';
            var totalSeconds = 0;
            var at;
            while (totalSeconds < 86400) {
                at = new Date(0); // The 0 there is the key, which sets the date to the epoch
                at.setUTCSeconds(trackingReminder.nextReminderTimeEpochSeconds + totalSeconds);
                notificationSettings.at = at;
                notificationSettings.id = parseInt(trackingReminder.id + "000" +  moment(at).format("HHMMSS"));
                totalSeconds = totalSeconds + trackingReminder.reminderFrequency;
                if(moment(at).format("HH:MM:SS") < $rootScope.user.latestReminderTime &&
                    moment(at).format("HH:MM:SS") > $rootScope.user.earliestReminderTime ){
                    console.debug("Scheduling notification because it is within time limits: " +
                        $rootScope.user.earliestReminderTime + " to " + $rootScope.user.latestReminderTime,
                        notificationSettings);
                    createOrUpdateIonicNotificationForTrackingReminder(notificationSettings);
                } else {
                    console.debug("NOT scheduling notification because it is outside time limits: " +
                        $rootScope.user.earliestReminderTime + " to " + $rootScope.user.latestReminderTime, notificationSettings);
                }
            }
        }
        function scheduleIosNotificationByTrackingReminder(trackingReminder) {
            // Using milliseconds might cause app to crash with this error:
            // NSInvalidArgumentException·unable to serialize userInfo: Error Domain=NSCocoaErrorDomain Code=3851 "Property list invalid for format: 200 (property lists cannot contain objects of type 'CFNull')" UserInfo={NSDeb
            var intervalInMinutes  = trackingReminder.reminderFrequency / 60;
            var everyString = 'day';
            if (intervalInMinutes === 1) {everyString = 'minute';}
            var numberOfPendingNotifications = 0;
            if($rootScope.numberOfPendingNotifications){
                numberOfPendingNotifications = $rootScope.numberOfPendingNotifications;
            }
            var notificationSettings = {
                //autoClear: true,  iOS doesn't recognize this property
                badge: 1, // Reduces user stress
                //badge: numberOfPendingNotifications,
                //color: undefined,  iOS doesn't recognize this property
                data: trackingReminder,
                //led: undefined,  iOS doesn't recognize this property
                //ongoing: false,  iOS doesn't recognize this property
                sound: "file://sound/silent.ogg",
                title: "Track " + trackingReminder.variableName,
                text: "Record a measurement",
                //ionIcon: config.appSettings.mobileNotificationImage,  iOS doesn't recognize this property
                id: trackingReminder.id
            };
            notificationSettings.every = everyString;
            //notificationSettings.sound = "res://platform_default";
            //notificationSettings.smallIcon = 'ic_stat_icon_bw';
            var totalSeconds = 0;
            var at;
            while (totalSeconds < 86400) {
                console.debug("iOS requires second, minute, hour, day, week, month, year so converting " +
                    intervalInMinutes + " minutes to string: " + everyString);
                at = new Date(0); // The 0 there is the key, which sets the date to the epoch
                at.setUTCSeconds(trackingReminder.nextReminderTimeEpochSeconds + totalSeconds);
                notificationSettings.at = at;
                notificationSettings.id = parseInt(trackingReminder.id + "000" +  moment(at).format("HHMMSS"));
                totalSeconds = totalSeconds + trackingReminder.reminderFrequency;
                if(moment(at).format("HH:MM:SS") < $rootScope.user.latestReminderTime &&
                    moment(at).format("HH:MM:SS") > $rootScope.user.earliestReminderTime ){
                    createOrUpdateIonicNotificationForTrackingReminder(notificationSettings);
                } else {
                    console.debug("Not scheduling notification because it's outside time limits", notificationSettings);
                }
            }
        }
        function scheduleChromeExtensionNotificationWithTrackingReminder(trackingReminder) {
            var alarmInfo = {};
            alarmInfo.when =  trackingReminder.nextReminderTimeEpochSeconds * 1000;
            alarmInfo.periodInMinutes = trackingReminder.reminderFrequency / 60;
            var alarmName = createChromeAlarmNameFromTrackingReminder(trackingReminder);
            alarmName = JSON.stringify(alarmName);
            chrome.alarms.getAll(function(alarms) {
                var hasAlarm = alarms.some(function(oneAlarm) {return oneAlarm.name === alarmName;});
                if (hasAlarm) {console.debug('Already have an alarm for ' + alarmName);}
                if (!hasAlarm) {
                    chrome.alarms.create(alarmName, alarmInfo);
                    console.debug('Created alarm for alarmName ' + alarmName, alarmInfo);
                }
            });
        }
        if(trackingReminder.reminderFrequency > 0){
            $ionicPlatform.ready(function () {
                //console.debug('Ionic is ready to schedule notifications');
                if (typeof cordova !== "undefined") {
                    cordova.plugins.notification.local.getAll(function (notifications) {
                        console.debug("scheduleNotificationByReminder: All notifications before scheduling", notifications);
                        for(var i = 0; i < notifications.length; i++){
                            if(notifications[i].every * 60 === trackingReminder.reminderFrequency &&
                                notifications[i].id === trackingReminder.id){
                                console.warn("already have a local notification with this trackingReminder's id " +
                                    "and frequency.  Might be" +
                                    " pointlessly rescheduling", trackingReminder);
                            }
                        }
                        if (ionic.Platform.isAndroid()) {scheduleAndroidNotificationByTrackingReminder(trackingReminder);
                        } else if (ionic.Platform.isIPad() || ionic.Platform.isIOS()) {scheduleIosNotificationByTrackingReminder(trackingReminder);}
                    });
                }
            });
            if ($rootScope.isChromeExtension || $rootScope.isChromeApp) {scheduleChromeExtensionNotificationWithTrackingReminder(trackingReminder);}
        }
    };
    quantimodoService.scheduleGenericNotification = function(notificationSettings){
        var deferred = $q.defer();
        if(!notificationSettings.every){
            console.error("scheduleGenericNotification: Called scheduleGenericNotification without providing " +
                "notificationSettings.every " +
                notificationSettings.every + ". Not going to scheduleGenericNotification.");
            deferred.resolve();
            return deferred.promise;
        }
        if(!notificationSettings.at){
            var at = new Date(0); // The 0 there is the key, which sets the date to the epoch
            var epochSecondsPlus15Minutes = new Date() / 1000 + 15 * 60;
            at.setUTCSeconds(epochSecondsPlus15Minutes);
            notificationSettings.at = at;
        }
        if(!notificationSettings.id){notificationSettings.id = quantimodoService.getPrimaryOutcomeVariable().id;}
        notificationSettings.title = "Time to track!";
        notificationSettings.text = "Open reminder inbox";
        notificationSettings.sound = "file://sound/silent.ogg";
        notificationSettings.badge = 0;
        if($rootScope.numberOfPendingNotifications > 0) {
            notificationSettings.text = $rootScope.numberOfPendingNotifications + " tracking reminder notifications";
            notificationSettings.badge = 1; // Less stressful
            //notificationSettings.badge = $rootScope.numberOfPendingNotifications;
        }
        if($rootScope.isAndroid){notificationSettings.icon = 'ic_stat_icon_bw';}
        if($rootScope.isIOS){
            var everyString = 'minute';
            if (notificationSettings.every > 1) {everyString = 'hour';}
            if (notificationSettings.every > 60) {everyString = 'day';}
            console.warn("scheduleGenericIosNotification: iOS requires second, minute, hour, day, week, " +
                "month, year so converting " +
                notificationSettings.every + " minutes to string: " + everyString);
            // Don't include notificationSettings.icon for iOS. I keep seeing "Unknown property: icon" in Safari console
            notificationSettings.every = everyString;
        }
        function scheduleGenericChromeExtensionNotification(intervalInMinutes) {
            console.debug('scheduleGenericChromeExtensionNotification: Reminder notification interval is ' + intervalInMinutes + ' minutes');
            var alarmInfo = {periodInMinutes: intervalInMinutes};
            console.debug("scheduleGenericChromeExtensionNotification: clear genericTrackingReminderNotificationAlarm");
            chrome.alarms.clear("genericTrackingReminderNotificationAlarm");
            console.debug("scheduleGenericChromeExtensionNotification: create genericTrackingReminderNotificationAlarm", alarmInfo);
            chrome.alarms.create("genericTrackingReminderNotificationAlarm", alarmInfo);
            console.debug("Alarm set, every " + intervalInMinutes + " minutes");
        }
        $ionicPlatform.ready(function () {
            if (typeof cordova !== "undefined") {
                if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {
                    deferred.resolve();
                    return deferred.promise;
                }
                cordova.plugins.notification.local.getAll(function (notifications) {
                    console.debug("scheduleGenericNotification: All notifications before scheduling", notifications);
                    if(notifications[0] && notifications[0].length === 1 &&
                        notifications[0].every === notificationSettings.every) {
                        console.warn("Not scheduling generic notification because we already have one with " +
                            "the same frequency.");
                        return;
                    }
                    cordova.plugins.notification.local.cancelAll(function () {
                        console.debug('cancelAllNotifications: notifications have been cancelled');
                        cordova.plugins.notification.local.getAll(function (notifications) {
                            console.debug("cancelAllNotifications: All notifications after cancelling", notifications);
                            cordova.plugins.notification.local.schedule(notificationSettings, function () {
                                console.debug('scheduleGenericNotification: notification scheduled' + JSON.stringify(notificationSettings));
                            });
                        });
                    });
                });
            }
        });
        if ($rootScope.isChromeExtension || $rootScope.isChromeApp) {
            scheduleGenericChromeExtensionNotification(notificationSettings.every);
            deferred.resolve();
        }
        return deferred.promise;
    };
    quantimodoService.cancelIonicNotificationById = function(notificationId){
        var deferred = $q.defer();
        if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {
            deferred.resolve();
            return deferred.promise;
        }
        $ionicPlatform.ready(function () {
            if (typeof cordova !== "undefined") {
                console.debug('cancelIonicNotificationById ' + notificationId);
                cordova.plugins.notification.local.cancel(notificationId, function (cancelledNotification) {
                    console.debug("Canceled notification ", cancelledNotification);
                });
            }
            deferred.resolve();
        });
        return deferred.promise;
    };
    quantimodoService.scheduleUpdateOrDeleteGenericNotificationsByDailyReminderTimes = function(trackingReminders){
        var deferred = $q.defer();
        if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {
            deferred.resolve();
            return deferred.promise;
        }
        if(!$rootScope.isMobile && !$rootScope.isChromeExtension){
            console.debug('Not scheduling notifications because we are not mobile or Chrome extension');
            deferred.resolve();
            return deferred.promise;
        }
        if($rootScope.isAndroid){
            this.cancelAllNotifications();
            console.debug('Not scheduling local notifications because Android uses push notifications');
            deferred.resolve();
            return deferred.promise;
        }
        if(!trackingReminders || !trackingReminders[0]){
            console.debug('Not scheduling notifications because we do not have any reminders');
            deferred.resolve();
            return deferred.promise;
        }
        /** @namespace trackingReminders[0].localDailyReminderNotificationTimesForAllReminders */
        var localDailyReminderNotificationTimesFromApi = trackingReminders[0].localDailyReminderNotificationTimesForAllReminders;
        console.debug('localDailyReminderNotificationTimesFromApi: ' + JSON.stringify(localDailyReminderNotificationTimesFromApi));
        if(localDailyReminderNotificationTimesFromApi.length < 1){
            console.warn('Cannot schedule notifications because ' + 'trackingReminders[0].localDailyReminderNotificationTimes is empty.');
            deferred.resolve();
            return deferred.promise;
        }
        if($rootScope.isMobile){
            if(!quantimodoService.shouldWeUseIonicLocalNotifications()) {
                deferred.resolve();
                return deferred.promise;
            }
            $ionicPlatform.ready(function () {
                cordova.plugins.notification.local.getAll(function (existingLocalNotifications) {
                    var notificationSettings = {
                        every: 60 * 24,
                        title: "How are you?",
                        text: "Time to track!",
                        sound: "file://sound/silent.ogg"
                    };
                    console.debug("scheduleUpdateOrDeleteGenericNotificationsByDailyReminderTimes: All " +
                        "existing notifications before scheduling", existingLocalNotifications);
                    for (var i = 0; i < existingLocalNotifications.length; i++) {
                        var existingReminderNotificationTimeFoundInApiResponse = false;
                        for (var j = 0; j < localDailyReminderNotificationTimesFromApi.length; j++) {
                            if (parseInt(localDailyReminderNotificationTimesFromApi[j].replace(":", "")) ===
                                existingLocalNotifications[i].id &&
                                existingLocalNotifications[i].text === notificationSettings.text
                            ) {
                                console.debug('Server has a reminder notification matching local notification ' +
                                    JSON.stringify(existingLocalNotifications[i]));
                                existingReminderNotificationTimeFoundInApiResponse = true;
                            }
                        }
                        if(!existingReminderNotificationTimeFoundInApiResponse) {
                            console.debug('No matching notification time found so cancelling this local notification ',
                                JSON.stringify(existingLocalNotifications[i]));
                            cordova.plugins.notification.local.cancel(existingLocalNotifications[i].id);
                        }
                    }
                    for (var k = 0; k < localDailyReminderNotificationTimesFromApi.length; k++) {
                        console.debug('localDailyReminderNotificationTimesFromApi[k] is ', localDailyReminderNotificationTimesFromApi[k]);
                        var existingLocalNotificationScheduled = false;
                        for (var l = 0; l < existingLocalNotifications.length; l++) {
                            if(!localDailyReminderNotificationTimesFromApi[k]){
                                console.error('localDailyReminderNotificationTimesFromApi[' + k + '] is not defined! ' +
                                    'localDailyReminderNotificationTimesFromApi: ', localDailyReminderNotificationTimesFromApi);
                            }
                            if (parseInt(localDailyReminderNotificationTimesFromApi[k].replace(":", "")) ===
                                existingLocalNotifications[l].id &&
                                existingLocalNotifications[l].text === notificationSettings.text) {
                                console.debug('Server has a reminder notification matching local notification ' + JSON.stringify(existingLocalNotifications[l]));
                                existingLocalNotificationScheduled = true;
                            }
                        }
                        if(!existingLocalNotificationScheduled) {
                            if(!localDailyReminderNotificationTimesFromApi[k]){
                                console.error("Did not get localDailyReminderNotificationTimesFromApi", trackingReminders);
                            }
                            var at = new Date();
                            var splitUpLocalDailyReminderNotificationTimesFromApi = localDailyReminderNotificationTimesFromApi[k].split(":");
                            at.setHours(splitUpLocalDailyReminderNotificationTimesFromApi[0]);
                            at.setMinutes(splitUpLocalDailyReminderNotificationTimesFromApi[1]);
                            var now = new Date();
                            if(at < now){at = new Date(at.getTime() + 60 * 60 * 24 * 1000);}
                            console.debug('No existing local notification so scheduling ', JSON.stringify(localDailyReminderNotificationTimesFromApi[k]));
                            notificationSettings.at = at;
                            notificationSettings.id = parseInt(localDailyReminderNotificationTimesFromApi[k].replace(":", ""));
                            if($rootScope.numberOfPendingNotifications > 0) {
                                notificationSettings.badge = 1; // Less stressful
                                //notificationSettings.badge = $rootScope.numberOfPendingNotifications;
                            }
                            if($rootScope.isAndroid){notificationSettings.icon = 'ic_stat_icon_bw';}
                            if($rootScope.isIOS){notificationSettings.every = 'day';}
                            if(!(notificationSettings.at instanceof Date)){
                                var errorMessage = 'Skipping notification creation because notificationSettings.at is not an instance of Date: ' + JSON.stringify(notificationSettings);
                                quantimodoService.reportErrorDeferred(errorMessage);
                                return;
                            }
                            if(!isNaN(notificationSettings.at) &&
                                parseInt(Number(notificationSettings.at)) === notificationSettings.at &&
                                !isNaN(parseInt(notificationSettings.at, 10))){
                                var intErrorMessage = 'Skipping notification creation because notificationSettings.at is not an instance of Date: ' + JSON.stringify(notificationSettings);
                                quantimodoService.reportErrorDeferred(intErrorMessage);
                                return;
                            }
                            try{
                                console.debug('scheduleUpdateOrDeleteGenericNotificationsByDailyReminderTimes: ' +
                                    'About to schedule this notification: ',
                                    JSON.stringify(notificationSettings));
                                cordova.plugins.notification.local.schedule(notificationSettings, function (notification) {
                                    console.debug('scheduleUpdateOrDeleteGenericNotificationsByDailyReminderTimes:' +
                                        ' notification scheduled: ' + JSON.stringify(notification));
                                });
                            } catch (exception) { if (typeof Bugsnag !== "undefined") { Bugsnag.notifyException(exception); }
                                console.error('scheduleUpdateOrDeleteGenericNotificationsByDailyReminderTimes' +
                                    ' notificationSettings: ' + JSON.stringify(notificationSettings));
                            }
                        }
                    }
                });
                deferred.resolve();
            });
        }

        if($rootScope.isChromeExtension){
            chrome.alarms.getAll(function(existingLocalAlarms) {
                console.debug('Existing Chrome alarms before scheduling: ', existingLocalAlarms);
                for (var i = 0; i < existingLocalAlarms.length; i++) {
                    var existingAlarmTimeFoundInApiResponse = false;
                    for (var j = 0; j < localDailyReminderNotificationTimesFromApi.length; j++) {
                        if (existingLocalAlarms[i].name === localDailyReminderNotificationTimesFromApi[j]) {
                            console.debug('Server has a reminder notification time matching time ' + existingLocalAlarms[i].name);
                            existingAlarmTimeFoundInApiResponse = true;
                        }
                    }
                    if(!existingAlarmTimeFoundInApiResponse) {
                        console.debug('No api reminder found matching so cancelling this alarm ', JSON.stringify(existingLocalAlarms[i]));
                        chrome.alarms.clear(existingLocalAlarms[i].name);
                    }
                }
                for (var k = 0; k < localDailyReminderNotificationTimesFromApi.length; k++) {
                    var existingAlarmScheduled = false;
                    for (var l = 0; l < existingLocalAlarms.length; l++) {
                        if (existingLocalAlarms[l].name === localDailyReminderNotificationTimesFromApi[k]) {
                            console.debug('Server has a reminder notification matching local notification ' +
                                JSON.stringify(existingLocalAlarms[i]));
                            existingAlarmScheduled = true;
                        }
                    }
                    if(!existingAlarmScheduled) {
                        if(!localDailyReminderNotificationTimesFromApi[k]){
                            console.error('localDailyReminderNotificationTimesFromApi[' + k + '] is not defined! ' +
                                'localDailyReminderNotificationTimesFromApi: ', localDailyReminderNotificationTimesFromApi);
                        }
                        var alarmInfo = {};
                        var at = new Date(); // The 0 there is the key, which sets the date to the epoch
                        var splitUpLocalDailyReminderNotificationTimesFromApi =
                            localDailyReminderNotificationTimesFromApi[k].split(":");
                        at.setHours(splitUpLocalDailyReminderNotificationTimesFromApi[0]);
                        at.setMinutes(splitUpLocalDailyReminderNotificationTimesFromApi[1]);
                        alarmInfo.when =  at.getTime();
                        alarmInfo.periodInMinutes = 24 * 60;
                        console.debug('No existing local notification so scheduling ', alarmInfo);
                        chrome.alarms.create(localDailyReminderNotificationTimesFromApi[k], alarmInfo);
                    }
                }
            });
            deferred.resolve();
        }
        return deferred.promise;
    };

    // cancel all existing notifications
    quantimodoService.cancelAllNotifications = function(){
        var deferred = $q.defer();
        if(typeof cordova !== "undefined" && typeof cordova.plugins.notification !== "undefined"){
            $ionicPlatform.ready(function () {
                cordova.plugins.notification.local.cancelAll(function () {
                    console.debug('cancelAllNotifications: notifications have been cancelled');
                    cordova.plugins.notification.local.getAll(function (notifications) {
                        console.debug("cancelAllNotifications: All notifications after cancelling", notifications);
                    });
                    deferred.resolve();
                });
            });
        } else if (typeof chrome !== "undefined" && typeof chrome.alarms !== "undefined"){
            chrome.alarms.clearAll(function (){
                console.debug('Cleared all Chrome alarms!');
                deferred.resolve();
            });
        } else {
            console.debug('cancelAllNotifications: Chrome and cordova are not defined.');
            deferred.resolve();
        }
        return deferred.promise;
    };

    // TIME SERVICE
    quantimodoService.getSecondsSinceMidnightLocalFromLocalString = function (localTimeString) {
        var timeFormat = "HH:mm:ss";
        var hours = parseInt(moment(localTimeString, timeFormat).format("HH"));
        var minutes = parseInt(moment(localTimeString, timeFormat).format("mm"));
        var seconds = parseInt(moment(localTimeString, timeFormat).format("ss"));
        var secondsSinceMidnightLocal = hours * 60 *60 + minutes * 60 + seconds;
        return secondsSinceMidnightLocal;
    };
    quantimodoService.getEpochTimeFromLocalString = function (localTimeString) {
        var timeFormat = "HH:mm:ss";
        var epochTime = moment(localTimeString, timeFormat).unix();
        return epochTime;
    };
    quantimodoService.getEpochTimeFromLocalStringRoundedToHour = function (localTimeString) {
        var timeFormat = "HH";
        var partsOfString = localTimeString.split(':');
        var epochTime = moment(partsOfString[0], timeFormat).unix();
        return epochTime;
    };
    quantimodoService.getLocalTimeStringFromUtcString = function (utcTimeString) {
        var timeFormat = "HH:mm:ss Z";
        var utcTimeStringFull = moment().format(timeFormat);
        if(utcTimeString){utcTimeStringFull = utcTimeString + " +0000";}
        var returnTimeFormat = "HH:mm:ss";
        var localTimeString = moment(utcTimeStringFull, timeFormat).format(returnTimeFormat);
        //console.debug("localTimeString is " + localTimeString);
        return localTimeString;
    };
    quantimodoService.humanFormat = function(hhmmssFormatString){
        var intitialTimeFormat = "HH:mm:ss";
        var humanTimeFormat = "h:mm A";
        return moment(hhmmssFormatString, intitialTimeFormat).format(humanTimeFormat);
    };
    quantimodoService.getUtcTimeStringFromLocalString = function (localTimeString) {
        var returnTimeFormat = "HH:mm:ss";
        var utcTimeString = moment(localTimeString, returnTimeFormat).utc().format(returnTimeFormat);
        console.debug("utcTimeString is " + utcTimeString);
        return utcTimeString;
    };
    quantimodoService.getLocalMidnightInUtcString = function () {
        var localMidnightMoment = moment(0, "HH");
        var timeFormat = 'YYYY-MM-DD HH:mm:ss';
        var localMidnightInUtcString = localMidnightMoment.utc().format(timeFormat);
        return localMidnightInUtcString;
    };
    quantimodoService.getTomorrowLocalMidnightInUtcString = function () {
        var tomorrowLocalMidnightMoment = moment(0, "HH");
        var timeFormat = 'YYYY-MM-DD HH:mm:ss';
        tomorrowLocalMidnightMoment.add(1, 'days');
        var tomorrowLocalMidnightInUtcString = tomorrowLocalMidnightMoment.utc().format(timeFormat);
        return tomorrowLocalMidnightInUtcString;
    };
    quantimodoService.getCurrentTimeInLocalString = function () {
        var currentMoment = moment();
        var timeFormat = 'HH:mm:ss';
        var currentTimeInLocalString = currentMoment.format(timeFormat);
        return currentTimeInLocalString;
    };
    quantimodoService.getCurrentDateTimeInUtcString = function () {
        var currentMoment = moment();
        var timeFormat = 'YYYY-MM-DD HH:mm:ss';
        var currentDateTimeInUtcString = currentMoment.utc().format(timeFormat);
        return currentDateTimeInUtcString;
    };
    quantimodoService.getCurrentDateTimeInUtcStringPlusMin = function (minutes) {
        var currentMoment = moment().add(minutes, 'minutes');
        var timeFormat = 'YYYY-MM-DD HH:mm:ss';
        var currentDateTimeInUtcStringPlus15Min = currentMoment.utc().format(timeFormat);
        return currentDateTimeInUtcStringPlus15Min;
    };
    quantimodoService.getSecondsSinceMidnightLocalRoundedToNearestFifteen = function (defaultStartTimeInSecondsSinceMidnightLocal) {
        // Round minutes
        var defaultStartTime = new Date(defaultStartTimeInSecondsSinceMidnightLocal * 1000);
        var defaultStartTimeHours = defaultStartTime.getUTCHours();
        var defaultStartTimeMinutes = defaultStartTime.getUTCMinutes();
        if (defaultStartTimeMinutes % 15 !== 0) {
            if ((defaultStartTimeMinutes > 0 && defaultStartTimeMinutes <= 7)) {defaultStartTimeMinutes = 0;}
            else if (defaultStartTimeMinutes > 7 && defaultStartTimeMinutes <= 22) {defaultStartTimeMinutes = 15;}
            else if (defaultStartTimeMinutes > 22 && defaultStartTimeMinutes <= 37) {defaultStartTimeMinutes = 30;}
            else if (defaultStartTimeMinutes > 37 && defaultStartTimeMinutes <= 52) {defaultStartTimeMinutes = 45;}
            else if (defaultStartTimeMinutes > 52) {
                defaultStartTimeMinutes = 0;
                if (defaultStartTimeHours === 23) {defaultStartTimeHours = 0;} else {defaultStartTimeHours += 1;}
            }
        }
        defaultStartTimeInSecondsSinceMidnightLocal = quantimodoService.getSecondsSinceMidnightLocalFromLocalString("" +
            defaultStartTimeHours + ":" + defaultStartTimeMinutes + ":00");
        return defaultStartTimeInSecondsSinceMidnightLocal;
    };
    quantimodoService.getSecondsSinceMidnightLocalRoundedToNearestFifteenFromLocalString = function (localString) {
        var secondsSinceMidnightLocal = quantimodoService.getSecondsSinceMidnightLocalFromLocalString(localString);
        return quantimodoService.getSecondsSinceMidnightLocalRoundedToNearestFifteen(secondsSinceMidnightLocal);
    };
    // Local Storage Services
    quantimodoService.deleteItemFromLocalStorage  = function(key){
        if ($rootScope.isChromeApp) {
            // Code running in a Chrome extension (content script, background page, etc.)
            chrome.storage.local.remove(key);
        } else {localStorage.removeItem(key);}
    };
    quantimodoService.deleteElementOfLocalStorageItemById = function(localStorageItemName, elementId){
        var deferred = $q.defer();
        var elementsToKeep = [];
        var localStorageItemAsString = quantimodoService.getLocalStorageItemAsString(localStorageItemName);
        var localStorageItemArray = JSON.parse(localStorageItemAsString);
        if(!localStorageItemArray){
            console.warn("Local storage item " + localStorageItemName + " not found");
        } else {
            for(var i = 0; i < localStorageItemArray.length; i++){
                if(localStorageItemArray[i].id !== elementId){elementsToKeep.push(localStorageItemArray[i]);}
            }
            this.setLocalStorageItem(localStorageItemName, JSON.stringify(elementsToKeep));
        }
        deferred.resolve(elementsToKeep);
        return deferred.promise;
    };
    quantimodoService.getElementOfLocalStorageItemById = function(localStorageItemName, elementId){
        var localStorageItemAsString = quantimodoService.getLocalStorageItemAsString(localStorageItemName);
        var localStorageItemArray = JSON.parse(localStorageItemAsString);
        if(!localStorageItemArray){
            console.warn("Local storage item " + localStorageItemName + " not found");
        } else {
            for(var i = 0; i < localStorageItemArray.length; i++){
                if(localStorageItemArray[i].id === elementId){return localStorageItemArray[i];}
            }
        }
    };
    quantimodoService.deleteElementsOfLocalStorageItemByProperty = function(localStorageItemName, propertyName, propertyValue){
        var deferred = $q.defer();
        var elementsToKeep = [];
        var localStorageItemArray = JSON.parse(quantimodoService.getLocalStorageItemAsString(localStorageItemName));
        if(!localStorageItemArray){
            console.error("Local storage item " + localStorageItemName + " not found");
        } else {
            for(var i = 0; i < localStorageItemArray.length; i++){
                if(localStorageItemArray[i][propertyName] !== propertyValue){elementsToKeep.push(localStorageItemArray[i]);}
            }
            quantimodoService.setLocalStorageItem(localStorageItemName, JSON.stringify(elementsToKeep));
        }
        deferred.resolve();
        return deferred.promise;
    };
    quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront = function(localStorageItemName, replacementElementArray){
        var deferred = $q.defer();
        if(replacementElementArray.constructor !== Array){ replacementElementArray = [replacementElementArray]; }
        // Have to stringify/parse to create cloned variable or it adds all stored reminders to the array to be posted
        var elementsToKeep = JSON.parse(JSON.stringify(replacementElementArray));
        var localStorageItemArray = JSON.parse(quantimodoService.getLocalStorageItemAsString(localStorageItemName));
        var found = false;
        if(localStorageItemArray){
            for(var i = 0; i < localStorageItemArray.length; i++){
                found = false;
                for (var j = 0; j < replacementElementArray.length; j++){
                    if(replacementElementArray[j].id &&
                        localStorageItemArray[i].id === replacementElementArray[j].id){
                        found = true;
                    }
                }
                if(!found){elementsToKeep.push(localStorageItemArray[i]);}
            }
        }
        quantimodoService.setLocalStorageItem(localStorageItemName, JSON.stringify(elementsToKeep));
        deferred.resolve();
        return deferred.promise;
    };
    quantimodoService.setLocalStorageItem = function(key, value){
        var deferred = $q.defer();
        if(typeof value !== "string"){value = JSON.stringify(value);}
        if ($rootScope.isChromeApp) {
            // Code running in a Chrome extension (content script, background page, etc.)
            var obj = {};
            obj[key] = value;
            chrome.storage.local.set(obj);
            deferred.resolve();
        } else {
            try {
                localStorage.setItem(key, value);
                deferred.resolve();
            } catch(error) {
                var metaData = { localStorageItems: quantimodoService.getLocalStorageList() };
                var name = error;
                var message = 'Error saving ' + key + ' to local storage';
                var severity = 'error';
                quantimodoService.bugsnagNotify(name, message, metaData, severity);
                quantimodoService.deleteLargeLocalStorageItems(metaData.localStorageItems);
                localStorage.setItem(key, value);
            }
        }
        return deferred.promise;
    };
    quantimodoService.deleteLargeLocalStorageItems = function(localStorageItemsArray){
        for (var i = 0; i < localStorageItemsArray.length; i++){
            if(localStorageItemsArray[i].kB > 2000){ localStorage.removeItem(localStorageItemsArray[i].name); }
        }
    };
    quantimodoService.getLocalStorageList = function(){
        var localStorageItemsArray = [];
        for (var i = 0; i < localStorage.length; i++){
            localStorageItemsArray.push({
                name: localStorage.key(i),
                value: localStorage.getItem(localStorage.key(i)),
                kB: Math.round(localStorage.getItem(localStorage.key(i)).length*16/(8*1024))
            });
        }
        return localStorageItemsArray.sort( function ( a, b ) { return b.kB - a.kB; } );
    };
    quantimodoService.getLocalStorageItemAsStringWithCallback = function(key, callback){
        if ($rootScope.isChromeApp) {
            // Code running in a Chrome extension (content script, background page, etc.)
            chrome.storage.local.get(key,function(val){
                callback(val[key]);
            });
        } else {
            var val = localStorage.getItem(key);
            callback(val);
        }
    };
    quantimodoService.getLocalStorageItemAsString = function(key) {
        if ($rootScope.isChromeApp) {
            // Code running in a Chrome extension (content script, background page, etc.)
            chrome.storage.local.get(key,function(val){
                return val[key];
            });
        } else {return localStorage.getItem(key);}
    };
    quantimodoService.getElementsFromLocalStorageItemWithFilters = function (localStorageItemName, filterPropertyName, filterPropertyValue,
                                                                             lessThanPropertyName, lessThanPropertyValue,
                                                                             greaterThanPropertyName, greaterThanPropertyValue) {
        var unfilteredElementArray = [];
        var itemAsString;
        var i;
        if ($rootScope.isChromeApp) {
            // Code running in a Chrome extension (content script, background page, etc.)
            chrome.storage.local.get(localStorageItemName,function(localStorageItems){
                itemAsString = localStorageItems[localStorageItemName];
            });
        } else {
            //console.debug(localStorage.getItem(localStorageItemName));
            itemAsString = localStorage.getItem(localStorageItemName);
        }
        if(!itemAsString){return null;}
        if(itemAsString === "undefined"){
            quantimodoService.reportErrorDeferred(localStorageItemName  + " local storage item is undefined!");
            return null;
        }
        var matchingElements = JSON.parse(itemAsString);
        if(matchingElements.length){
            if(greaterThanPropertyName && typeof matchingElements[0][greaterThanPropertyName] === "undefined") {
                console.error(greaterThanPropertyName + " greaterThanPropertyName does not exist for " + localStorageItemName);
            }
            if(filterPropertyName && typeof matchingElements[0][filterPropertyName] === "undefined"){
                console.error(filterPropertyName + " filterPropertyName does not exist for " + localStorageItemName);
            }
            if(lessThanPropertyName && typeof matchingElements[0][lessThanPropertyName] === "undefined"){
                console.error(lessThanPropertyName + " lessThanPropertyName does not exist for " + localStorageItemName);
            }
        }
        if(filterPropertyName && typeof filterPropertyValue !== "undefined" && filterPropertyValue !== null){
            if(matchingElements){unfilteredElementArray = matchingElements;}
            matchingElements = [];
            for(i = 0; i < unfilteredElementArray.length; i++){
                if(unfilteredElementArray[i][filterPropertyName] === filterPropertyValue){
                    matchingElements.push(unfilteredElementArray[i]);
                }
            }
        }
        if(lessThanPropertyName && lessThanPropertyValue){
            if(matchingElements){unfilteredElementArray = matchingElements;}
            matchingElements = [];
            for(i = 0; i < unfilteredElementArray.length; i++){
                if(unfilteredElementArray[i][lessThanPropertyName] < lessThanPropertyValue){
                    matchingElements.push(unfilteredElementArray[i]);
                }
            }
        }
        if(greaterThanPropertyName && greaterThanPropertyValue){
            if(matchingElements){unfilteredElementArray = matchingElements;}
            matchingElements = [];
            for(i = 0; i < unfilteredElementArray.length; i++){
                if(unfilteredElementArray[i][greaterThanPropertyName] > greaterThanPropertyValue){
                    matchingElements.push(unfilteredElementArray[i]);
                }
            }
        }
        return matchingElements;
    };
    quantimodoService.searchLocalStorage = function (localStorageItemName, filterPropertyName, searchQuery, requestParams) {
        var matchingElements = [];
        var unfilteredElementArray = quantimodoService.getElementsFromLocalStorageItemWithRequestParams(localStorageItemName, requestParams);
        if(!unfilteredElementArray || !unfilteredElementArray.length){return null;}
        if(filterPropertyName && typeof unfilteredElementArray[0][filterPropertyName] === "undefined"){
            console.error(filterPropertyName + " filterPropertyName does not exist for " + localStorageItemName);
            return null;
        }
        for(var i = 0; i < unfilteredElementArray.length; i++){
            if(unfilteredElementArray[i][filterPropertyName].toLowerCase().indexOf(searchQuery.toLowerCase()) !== -1){
                matchingElements.push(unfilteredElementArray[i]);
            }
        }
        if(requestParams && requestParams.sort){matchingElements = quantimodoService.sortByProperty(matchingElements, requestParams.sort);}
        return matchingElements;
    };
    quantimodoService.sortByProperty = function(arrayToSort, propertyName){
        if(!arrayToSort){return [];}
        if(arrayToSort.length < 2){return arrayToSort;}
        if(propertyName.indexOf('-') > -1){
            arrayToSort.sort(function(a, b){return b[propertyName.replace('-', '')] - a[propertyName.replace('-', '')];});
        } else {
            arrayToSort.sort(function(a, b){return a[propertyName] - b[propertyName];});
        }
        return arrayToSort;
    };
    quantimodoService.getLocalStorageItemAsObject = function(key) {
        if ($rootScope.isChromeApp) {
            // Code running in a Chrome extension (content script, background page, etc.)
            chrome.storage.local.get(key,function(val){
                var item = val[key];
                item = convertToObjectIfJsonString(item);
                return item;
            });
        } else {
            var item = localStorage.getItem(key);
            item = convertToObjectIfJsonString(item);
            return item;
        }
    };
    quantimodoService.clearLocalStorage = function(){
        console.debug('Clearing local storage!');
        if ($rootScope.isChromeApp) {chrome.storage.local.clear();} else {localStorage.clear();}
        quantimodoService.putCommonVariablesInLocalStorage();
    };
    var convertToObjectIfJsonString = function(stringOrObject) {
        try {stringOrObject = JSON.parse(stringOrObject);} catch (e) {return stringOrObject;}
        return stringOrObject;
    };
    quantimodoService.getCachedResponse = function(requestName, params, ignoreExpiration){
        if(!params){
            console.error('No params provided to getCachedResponse');
            return false;
        }
        var cachedResponse = JSON.parse(quantimodoService.getLocalStorageItemAsString(requestName));
        if(!cachedResponse || !cachedResponse.expirationTimeMilliseconds){return false;}
        var paramsMatch = JSON.stringify(cachedResponse.requestParams) === JSON.stringify(params);
        if(!paramsMatch){return false;}
        var cacheNotExpired = Date.now() < cachedResponse.expirationTimeMilliseconds;
        if(ignoreExpiration){cacheNotExpired = true;}
        if(!cacheNotExpired){return false;}
        //if(!cachedResponse.response.length){return false;} // Doesn't work if response is an object instead of array
        return cachedResponse.response;
    };
    quantimodoService.storeCachedResponse = function(requestName, params, response){
        var cachedResponse = {requestParams: params, response: response, expirationTimeMilliseconds: Date.now() + 86400 * 1000};
        quantimodoService.setLocalStorageItem(requestName, JSON.stringify(cachedResponse));
    };
    quantimodoService.deleteCachedResponse = function(requestName){quantimodoService.deleteItemFromLocalStorage(requestName);};
    quantimodoService.getElementsFromLocalStorageItemWithRequestParams = function(localStorageItemName, requestParams) {
        var greaterThanPropertyName = null;
        var greaterThanPropertyValue = null;
        var lessThanPropertyName = null;
        var lessThanPropertyValue = null;
        var filterPropertyValue = null;
        var log = [];
        var filterPropertyValues = [];
        var filterPropertyNames = [];
        angular.forEach(requestParams, function(value, key) {
            if(typeof value === "string" && value.indexOf('(lt)') !== -1){
                lessThanPropertyValue = value.replace('(lt)', "");
                if(!isNaN(lessThanPropertyValue)){lessThanPropertyValue = Number(lessThanPropertyValue);}
                lessThanPropertyName = key;
            } else if (typeof value === "string" && value.indexOf('(gt)') !== -1){
                greaterThanPropertyValue = value.replace('(gt)', "");
                if(!isNaN(greaterThanPropertyValue)){greaterThanPropertyValue = Number(greaterThanPropertyValue);}
                greaterThanPropertyName = key;
            } else if (typeof value === "string" && value !== "Anything" && key !== "sort"){
                if(!isNaN(value)){filterPropertyValues = Number(filterPropertyValue);} else {filterPropertyValues.push(value);}
                filterPropertyNames.push(key);
            } else if (typeof value === "boolean" && (key === "outcome" || (key === 'manualTracking' && value === true))){
                filterPropertyValues.push(value);
                filterPropertyNames.push(key);
            }
        }, log);
        var results =  quantimodoService.getElementsFromLocalStorageItemWithFilters(localStorageItemName, null,
            null, lessThanPropertyName, lessThanPropertyValue, greaterThanPropertyName, greaterThanPropertyValue);
        if(results){
            for(var i = 0; i < filterPropertyNames.length; i++){
                results = results.filter(function( obj ) {return obj[filterPropertyNames[i]] === filterPropertyValues[i];});
            }
        }
        return results;
    };
    quantimodoService.removeItemsWithDifferentName = function(arrayOfObjects, queryTerm){
        return arrayOfObjects.filter(function( obj ) {return obj.name.toLowerCase().indexOf(queryTerm.toLowerCase()) !== -1;});
    };
    quantimodoService.arrayHasItemWithNameProperty = function(arrayOfObjects){
        return arrayOfObjects && arrayOfObjects.length && arrayOfObjects[0] && arrayOfObjects[0].name;
    };
    // LOGIN SERVICES
    quantimodoService.fetchAccessTokenAndUserDetails = function(authorization_code, withJWT) {
        quantimodoService.getAccessTokenFromAuthorizationCode(authorization_code, withJWT)
            .then(function(response) {
                quantimodoService.hideLoader();
                if(response.error){
                    quantimodoService.reportErrorDeferred(response.error);
                    console.error("Error generating access token");
                    quantimodoService.setLocalStorageItem('user', null);
                } else {
                    console.debug("Access token received",response);
                    quantimodoService.saveAccessTokenInLocalStorage(response);
                    console.debug('get user details from server and going to defaultState...');
                    quantimodoService.showBlackRingLoader();
                    quantimodoService.refreshUser().then(function(user){
                        quantimodoService.hideLoader();
                        quantimodoService.syncAllUserData();
                        console.debug($state.current.name + ' quantimodoService.fetchAccessTokenAndUserDetails got this user ' + JSON.stringify(user));
                    }, function(error){
                        quantimodoService.hideLoader();
                        quantimodoService.reportErrorDeferred($state.current.name + ' could not refresh user because ' + JSON.stringify(error));
                    });
                }
            }).catch(function(exception){ if (typeof Bugsnag !== "undefined") { Bugsnag.notifyException(exception); }
                quantimodoService.hideLoader();
                quantimodoService.setLocalStorageItem('user', null);
            });
    };
    quantimodoService.nonNativeMobileLogin = function(register) {
        console.debug('quantimodoService.nonNativeMobileLogin: open the auth window via inAppBrowser.');
        // Set location=yes instead of location=no temporarily to try to diagnose intermittent white screen on iOS
        //var ref = window.open(url,'_blank', 'location=no,toolbar=yes');
        // Try clearing inAppBrowser cache to avoid intermittent connectors page redirection problem
        // Note:  Clearing cache didn't solve the problem, but I'll leave it because I don't think it hurts anything
        var ref = window.open(quantimodoService.generateV1OAuthUrl(register),'_blank', 'location=no,toolbar=yes,clearcache=yes,clearsessioncache=yes');
        // Commented because I think it's causing "$apply already in progress" error
        // $timeout(function () {
        //     console.debug('quantimodoService.nonNativeMobileLogin: Automatically closing inAppBrowser auth window after 60 seconds.');
        //     ref.close();
        // }, 60000);
        console.debug('quantimodoService.nonNativeMobileLogin: listen to its event when the page changes');
        ref.addEventListener('loadstart', function(event) {
            console.debug('quantimodoService.nonNativeMobileLogin: Checking if changed url ' + event.url + ' is the same as redirection url ' + quantimodoService.getRedirectUri());
            if(quantimodoService.startsWith(event.url, quantimodoService.getRedirectUri())) {
                console.debug('quantimodoService.nonNativeMobileLogin: event.url starts with ' + quantimodoService.getRedirectUri());
                if(!quantimodoService.getUrlParameter('error', event.url)) {
                    var authorizationCode = quantimodoService.getAuthorizationCodeFromUrl(event);
                    ref.close();
                    console.debug('quantimodoService.nonNativeMobileLogin: Going to get an access token using authorization code.');
                    quantimodoService.fetchAccessTokenAndUserDetails(authorizationCode);
                } else {
                    var errorMessage = "quantimodoService.nonNativeMobileLogin: error occurred:" + quantimodoService.getUrlParameter('error', event.url);
                    quantimodoService.reportErrorDeferred(errorMessage);
                    ref.close();
                }
            }
        });
    };
    quantimodoService.chromeAppLogin = function(register){
        console.debug("login: Use Chrome app (content script, background page, etc.");
        var url = quantimodoService.generateV1OAuthUrl(register);
        chrome.identity.launchWebAuthFlow({'url': url, 'interactive': true
        }, function() {
            var authorizationCode = quantimodoService.getAuthorizationCodeFromUrl(event);
            quantimodoService.getAccessTokenFromAuthorizationCode(authorizationCode);
        });
    };
    quantimodoService.chromeExtensionLogin = function(register) {
        var loginUrl = quantimodoService.getQuantiModoUrl("api/v2/auth/login");
        if (register === true) {loginUrl = quantimodoService.getQuantiModoUrl("api/v2/auth/register");}
        console.debug("Using Chrome extension, so we use sessions instead of OAuth flow. ");
        chrome.tabs.create({ url: loginUrl });
        window.close();
    };
    quantimodoService.oAuthBrowserLogin = function (register) {
        var url = quantimodoService.generateV1OAuthUrl(register);
        console.debug("Going to try logging in by opening new tab at url " + url);
        quantimodoService.showBlackRingLoader();
        var ref = window.open(url, '_blank');
        if (!ref) {
            alert("You must first unblock popups, and and refresh the page for this to work!");
        } else {
            console.debug('Opened ' + url + ' and now broadcasting isLoggedIn message question every second to sibling tabs');
            var interval = setInterval(function () {ref.postMessage('isLoggedIn?', quantimodoService.getRedirectUri());}, 1000);
            // handler when a message is received from a sibling tab
            window.onMessageReceived = function (event) {
                console.debug("message received from sibling tab", event.url);
                if(interval !== false){
                    // Don't ask login question anymore
                    clearInterval(interval);
                    interval = false;
                    // the url that quantimodoService redirected us to
                    var iframe_url = event.data;
                    // validate if the url is same as we wanted it to be
                    if (quantimodoService.startsWith(iframe_url, quantimodoService.getRedirectUri())) {
                        // if there is no error
                        if (!quantimodoService.getUrlParameter('error', iframe_url)) {
                            var authorizationCode = quantimodoService.getAuthorizationCodeFromUrl(event);
                            // get access token from authorization code
                            quantimodoService.fetchAccessTokenAndUserDetails(authorizationCode);
                            // close the sibling tab
                            ref.close();
                        } else {
                            // TODO : display_error
                            alert('Could not login.  Please contact mike@quantimo.do');
                            quantimodoService.reportErrorDeferred("Error occurred validating redirect " + iframe_url +
                                ". Closing the sibling tab." + quantimodoService.getUrlParameter('error', iframe_url));
                            console.error("Error occurred validating redirect url. Closing the sibling tab.",
                                quantimodoService.getUrlParameter('error', iframe_url));
                            // close the sibling tab
                            ref.close();
                        }
                    }
                }
            };
            // listen to broadcast messages from other tabs within browser
            window.addEventListener("message", window.onMessageReceived, false);
        }
    };
    quantimodoService.forecastioWeather = function(coordinates) {
        if(!$rootScope.user){
            console.debug("No recording weather because we're not logged in");
            return;
        }
        var lastPostedWeatherAt = Number(quantimodoService.getLocalStorageItemAsString('lastPostedWeatherAt'));
        var localMidnightMoment = moment(0, "HH");
        var localMidnightTimestamp = localMidnightMoment.unix();
        var yesterdayNoonTimestamp = localMidnightTimestamp - 86400/2;
        if(lastPostedWeatherAt && lastPostedWeatherAt > yesterdayNoonTimestamp){
            console.debug("recently posted weather already");
            return;
        }
        var FORECASTIO_KEY = '81b54a0d1bd6e3ccdd52e777be2b14cb';
        var url = 'https://api.forecast.io/forecast/' + FORECASTIO_KEY + '/';
        url = url + coordinates.latitude + ',' + coordinates.longitude + ',' + yesterdayNoonTimestamp + '?callback=JSON_CALLBACK';
        console.debug('Checking weather forecast at ' + url);
        var measurementSets = [];
        $http.jsonp(url).success(function(data) {
            console.log(data);
            measurementSets.push({
                variableCategoryName: "Environment",
                variableName: data.daily.data[0].icon.replace('-', ' '),
                combinationOperation: "MEAN",
                sourceName: $rootScope.appSettings.appDisplayName,
                unitAbbreviatedName: "count",
                fillingValue: 0,
                measurements: [{
                    value: 1,
                    startTimeEpoch: checkIfStartTimeEpochIsWithinTheLastYear(yesterdayNoonTimestamp),
                    //note: data.daily.data[0].icon // We shouldn't add icon as note because it messes up the note analysis
                }]}
            );
            measurementSets.push({
                variableCategoryName: "Environment",
                variableName: "Outdoor Temperature",
                combinationOperation: "MEAN",
                sourceName: $rootScope.appSettings.appDisplayName,
                unitAbbreviatedName: "F",
                measurements: [{
                    value: (data.daily.data[0].temperatureMax +  data.daily.data[0].temperatureMin)/2,
                    startTimeEpoch: checkIfStartTimeEpochIsWithinTheLastYear(yesterdayNoonTimestamp)
                    //note: data.daily.data[0].icon // We shouldn't add icon as note because it messes up the note analysis
                }]}
            );
            measurementSets.push({
                variableCategoryName: "Environment",
                variableName: "Barometric Pressure",
                combinationOperation: "MEAN",
                sourceName: $rootScope.appSettings.appDisplayName,
                unitAbbreviatedName: "Pa",
                measurements: [{
                    value: data.daily.data[0].pressure * 100,
                    startTimeEpoch: checkIfStartTimeEpochIsWithinTheLastYear(yesterdayNoonTimestamp)
                    //note: data.daily.data[0].icon // We shouldn't add icon as note because it messes up the note analysis
                }]}
            );
            measurementSets.push({
                variableCategoryName: "Environment",
                variableName: "Outdoor Humidity",
                combinationOperation: "MEAN",
                sourceName: $rootScope.appSettings.appDisplayName,
                unitAbbreviatedName: "%",
                measurements: [{
                    value: data.daily.data[0].humidity * 100,
                    startTimeEpoch: checkIfStartTimeEpochIsWithinTheLastYear(yesterdayNoonTimestamp)
                    //note: data.daily.data[0].icon // We shouldn't add icon as note because it messes up the note analysis
                }]}
            );
            if(data.daily.data[0].visibility){
                measurementSets.push({
                    variableCategoryName: "Environment",
                    variableName: "Outdoor Visibility",
                    combinationOperation: "MEAN",
                    sourceName: $rootScope.appSettings.appDisplayName,
                    unitAbbreviatedName: "miles",
                    measurements: [{
                        value: data.daily.data[0].visibility,
                        startTimeEpoch: checkIfStartTimeEpochIsWithinTheLastYear(yesterdayNoonTimestamp)
                        //note: data.daily.data[0].icon // We shouldn't add icon as note because it messes up the note analysis
                    }]}
                );
            }
            measurementSets.push({
                variableCategoryName: "Environment",
                variableName: "Cloud Cover",
                combinationOperation: "MEAN",
                sourceName: $rootScope.appSettings.appDisplayName,
                unitAbbreviatedName: "%",
                measurements: [{
                    value: data.daily.data[0].cloudCover * 100,
                    startTimeEpoch: checkIfStartTimeEpochIsWithinTheLastYear(yesterdayNoonTimestamp)
                    //note: data.daily.data[0].icon  // We shouldn't add icon as note because it messes up the note analysis
                }]}
            );
            quantimodoService.postMeasurementsToApi(measurementSets, function (response) {
                console.debug("posted weather measurements");
                if(response && response.data && response.data.userVariables){
                    quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('userVariables', response.data.userVariables);
                }
                if(!lastPostedWeatherAt){quantimodoService.setLocalStorageItem('lastPostedWeatherAt', getUnixTimestampInSeconds());}
            }, function (error) {console.debug("could not post weather measurements: " + error);});
        }).error(function (data) {console.debug("Request failed");});
    };
    quantimodoService.setupHelpCards = function () {
        var locallyStoredHelpCards = localStorage.getItem('defaultHelpCards');
        if(locallyStoredHelpCards && locallyStoredHelpCards !== "undefined"){
            locallyStoredHelpCards = JSON.parse(locallyStoredHelpCards);
            return locallyStoredHelpCards;
        }
        localStorage.setItem('defaultHelpCards', JSON.stringify(config.appSettings.appDesign.helpCard.active));
        return config.appSettings.appDesign.helpCard.active;
    };
    quantimodoService.colors = {
        green: {backgroundColor: "#0f9d58", circleColor: "#03c466"},
        blue: {backgroundColor: "#3467d6", circleColor: "#5b95f9"},
        yellow: {backgroundColor: "#f09402", circleColor: "#fab952"}
    };
    quantimodoService.setupOnboardingPages = function (onboardingPages) {
        var onboardingPagesFromLocalStorage = quantimodoService.getLocalStorageItemAsObject('onboardingPages');
        var activeOnboardingPages = $rootScope.appSettings.appDesign.onboarding.active;
        if(onboardingPagesFromLocalStorage && onboardingPagesFromLocalStorage.length && onboardingPagesFromLocalStorage !== "undefined"){
            if(!$rootScope.appSettings.designMode){activeOnboardingPages = onboardingPagesFromLocalStorage;}
        }
        $rootScope.appSettings.appDesign.onboarding.active = quantimodoService.addColorsCategoriesAndNames(activeOnboardingPages);
    };
    $rootScope.signUpQuestions = [
        {
            question: "What do you do with my data?",
            answer: "Your data belongs entirely to you. We do not sell or otherwise do anything with your data to " +
                "put your privacy at risk.  "
        },
        {
            question: "Can I pause my account?",
            answer: "You can pause or quit at any time. You have complete control."
        },
        {
            question: "Data Security",
            answer: "Our customers have demanding security and privacy requirements. Our platform was designed using " +
                "the most rigorous security standards, using the same technology used by online banks."
        },
    ];
    quantimodoService.setupUpgradePages = function () {
        var upgradePages = [
            {
                id: "upgradePage",
                title: 'QuantiModo Plus',
                "backgroundColor": "#3467d6",
                circleColor: "#fefdfc",
                iconClass: "icon positive ion-ios-medkit-outline",
                image: {
                    url: "img/robots/quantimodo-robot-waving.svg"
                },
                bodyText: "I need to eat electricity to live and I am very hungry.  Please help me by subscribing or I will die."
            },
            {
                id: "addTreatmentRemindersCard",
                title: 'Any Treatments?',
                "backgroundColor": "#f09402",
                circleColor: "#fab952",
                variableCategoryName: "Treatments",
                bodyText: 'Are you taking any medications, treatments, supplements, or other interventions ' +
                'like meditation or psychotherapy? ',
                buttons: [
                    {
                        id: "hideAddTreatmentRemindersCardButton",
                        buttonText: 'Nope',
                        buttonIconClass: "ion-checkmark",
                        buttonClass: "button button-clear button-assertive",
                        clickFunctionCall: function(){$rootScope.hideUpgradePage();}
                    }
                ]
            },
            {
                id: "addSymptomRemindersCard",
                title: 'Recurring Symptoms?',
                "backgroundColor": "#3467d6",
                circleColor: "#5b95f9",
                variableCategoryName: "Symptoms",
                bodyText: 'Got any recurring symptoms that vary in their severity?',
                buttons: [
                    {
                        id: "hideAddSymptomRemindersCardButton",
                        buttonText: 'Nope',
                        buttonIconClass: "ion-checkmark",
                        buttonClass: "button button-clear button-assertive",
                        clickFunctionCall: function(){$rootScope.hideUpgradePage();}
                    }
                ]
            },
            {
                id: "addEmotionRemindersCard",
                title: 'Varying Emotions?',
                "backgroundColor": "#0f9d58",
                circleColor: "#03c466",
                variableCategoryName: "Emotions",
                bodyText: "Do you have any emotions that fluctuate regularly?<br><br>If so, add them so I can try to " +
                    "determine which factors are influencing them.",
                buttons: [
                    {
                        id: "hideAddEmotionRemindersCardButton",
                        buttonText: 'Nope',
                        buttonIconClass: "ion-checkmark",
                        buttonClass: "button button-clear button-assertive",
                        clickFunctionCall: function(){$rootScope.hideUpgradePage();}
                    }
                ]
            },
            {
                id: "addFoodRemindersCard",
                title: 'Common Foods or Drinks?',
                "backgroundColor": "#3467d6",
                circleColor: "#5b95f9",
                variableCategoryName: "Foods",
                bodyText: "Add any foods or drinks that you consume more than a few times a week",
                buttons: [
                    {
                        id: "hideAddFoodRemindersCardButton",
                        buttonText: 'Nope',
                        buttonIconClass: "ion-checkmark",
                        buttonClass: "button button-clear button-assertive",
                        clickFunctionCall: function(){$rootScope.hideUpgradePage();}
                    }
                ]
            },
            {
                id: "locationTrackingInfoCard",
                title: 'Location Tracking',
                "backgroundColor": "#0f9d58",
                circleColor: "#03c466",
                bodyText: "Would you like to automatically log location? ",
                moreInfo: $rootScope.variableCategories.Location.moreInfo,
                buttons: [
                    {
                        id: "hideLocationTrackingInfoCardButton",
                        buttonText: 'NO',
                        buttonIconClass: "ion-flash-off",
                        buttonClass: "button button-clear button-assertive",
                        clickFunctionCall: function(){$rootScope.hideUpgradePage();}
                    }
                ]
            },
            {
                id: "weatherTrackingInfoCard",
                title: 'Weather Tracking',
                "backgroundColor": "#0f9d58",
                circleColor: "#03c466",
                variableCategoryName: "Environment",
                bodyText: "Would you like to automatically log the weather to see how it might be affecting you? ",
                buttons: [
                    {
                        id: "hideLocationTrackingInfoCardButton",
                        buttonText: 'NO',
                        buttonIconClass: "ion-flash-off",
                        buttonClass: "button button-clear button-assertive",
                        clickFunctionCall: function(){$rootScope.hideUpgradePage();}
                    }
                ]
            },
            {
                id: "importDataCard",
                title: 'Import Your Data',
                "backgroundColor": "#f09402",
                circleColor: "#fab952",
                iconClass: "icon positive ion-ios-cloud-download-outline",
                image: {
                    url: "img/intro/download_2-96.png",
                    height: "96",
                    width: "96"
                },
                bodyText: "Let's go to the Import Data page and see if you're using any of the dozens of apps and " +
                    "devices that I can automatically pull data from!",
                buttons: [
                    {
                        id: "hideImportDataCardButton",
                        buttonText: 'Done connecting data sources',
                        buttonIconClass: "ion-checkmark",
                        buttonClass: "button button-clear button-assertive",
                        clickFunctionCall: function(){$rootScope.hideUpgradePage();}
                    }
                ]
            },
            {
                id: "allDoneCard",
                title: 'Great job!',
                "backgroundColor": "#3467d6",
                circleColor: "#fefdfc",
                iconClass: "icon positive ion-ios-cloud-download-outline",
                image: {
                    url: "img/robots/quantimodo-robot-waving.svg"
                },
                bodyText: "You're all set up!  Let's take a minute to record your first measurements and then " +
                "you're done for the day! ",
                buttons: [
                    {
                        id: "goToInboxButton",
                        buttonText: 'GO TO INBOX',
                        buttonIconClass: "ion-ios-filing-outline",
                        buttonClass: "button button-clear button-assertive",
                        clickFunctionCall: function(){$rootScope.doneUpgrade();}
                    }
                ]
            }
        ];
        var upgradePagesFromLocalStorage = quantimodoService.getLocalStorageItemAsObject('upgradePages');
        if(upgradePagesFromLocalStorage && upgradePagesFromLocalStorage.length &&
            upgradePagesFromLocalStorage !== "undefined"){
            upgradePages = upgradePagesFromLocalStorage;
        }
        $rootScope.upgradePages = upgradePages;
    };
    quantimodoService.postCreditCard = function(body, successHandler, errorHandler) {
        quantimodoService.post('api/v2/account/subscribe', [], body, successHandler, errorHandler);
    };
    quantimodoService.postCreditCardDeferred = function(body){
        var deferred = $q.defer();
        quantimodoService.postCreditCard(body, function(response){
            $rootScope.user = response.user;
            quantimodoService.setLocalStorageItem('user', JSON.stringify($rootScope.user));
            localStorage.user = JSON.stringify($rootScope.user); // For Chrome Extension
            deferred.resolve(response);
        }, function(response){
            deferred.reject(response);
        });
        return deferred.promise;
    };
    quantimodoService.postDowngradeSubscription = function(body, successHandler, errorHandler) {
        quantimodoService.post('api/v2/account/unsubscribe', [], body, successHandler, errorHandler);
    };
    quantimodoService.postDowngradeSubscriptionDeferred = function(){
        var deferred = $q.defer();
        $rootScope.user.stripeActive = false;
        quantimodoService.reportErrorDeferred('User downgraded subscription: ' + JSON.stringify($rootScope.user));
        quantimodoService.postDowngradeSubscription({}, function(response){
            $rootScope.user = response.user;
            quantimodoService.setLocalStorageItem('user', JSON.stringify($rootScope.user));
            localStorage.user = JSON.stringify($rootScope.user); // For Chrome Extension
            deferred.resolve(response);
        }, function(response){deferred.reject(response);});
        return deferred.promise;
    };
    quantimodoService.sendWithEmailComposer = function(subjectLine, emailBody, emailAddress, fallbackUrl){
        if(!cordova || !cordova.plugins.email){
            quantimodoService.reportErrorDeferred('Trying to send with cordova.plugins.email even though it is not installed. ' +
                ' Using quantimodoService.sendWithMailTo instead.');
            quantimodoService.sendWithMailTo(subjectLine, emailBody, emailAddress, fallbackUrl);
            return;
        }
        if(!emailAddress){emailAddress = null;}
        document.addEventListener('deviceready', function () {
            console.debug('deviceready');
            cordova.plugins.email.isAvailable(
                function (isAvailable) {
                    if(isAvailable){
                        if(window.plugins && window.plugins.emailComposer) {
                            console.debug('Generating email with cordova-plugin-email-composer');
                            window.plugins.emailComposer.showEmailComposerWithCallback(function(result) {
                                    console.debug("Response -> " + result);
                                },
                                subjectLine, // Subject
                                emailBody,                      // Body
                                emailAddress,    // To
                                'info@quantimo.do',                    // CC
                                null,                    // BCC
                                true,                   // isHTML
                                null,                    // Attachments
                                null);                   // Attachment Data
                        } else {
                            console.error('window.plugins.emailComposer not available!');
                            quantimodoService.sendWithMailTo(subjectLine, emailBody, emailAddress, fallbackUrl);
                        }
                    } else {
                        console.error('Email has not been configured for this device!');
                        quantimodoService.sendWithMailTo(subjectLine, emailBody, emailAddress, fallbackUrl);
                    }
                }
            );
        }, false);
    };
    quantimodoService.sendWithMailTo = function(subjectLine, emailBody, emailAddress){
        var emailUrl = 'mailto:';
        if(emailAddress){emailUrl = emailUrl + emailAddress;}
        emailUrl = emailUrl + '?subject=' + subjectLine + '&body=' + emailBody;
        quantimodoService.openSharingUrl(emailUrl);
    };
    quantimodoService.openSharingUrl = function(sharingUrl){
        var newTab = window.open(sharingUrl,'_system');
        if(!newTab){ alert("Please unblock popups and press the share button again!"); }
    };
    quantimodoService.addVariableToLocalStorage = function(variable){
        if(variable.userId){quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('userVariables', variable);}
        quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('commonVariables', variable);
    };
    quantimodoService.sendEmailViaAPI = function(body, successHandler, errorHandler){
        quantimodoService.post('api/v2/email', [], body, successHandler, errorHandler);
    };
    quantimodoService.sendEmailViaAPIDeferred = function(emailType) {
        var deferred = $q.defer();
        quantimodoService.sendEmailViaAPI({emailType: emailType}, function(){
            deferred.resolve();
        }, function(error){
            deferred.reject(error);
        });
        return deferred.promise;
    };
    var upgradeSubscriptionProducts = {
        monthly7: {
            baseProductId: 'monthly7',
            name: 'QuantiModo Plus Monthly Subscription',
            category: 'Subscription/End-User',  //The category to which the product belongs (e.g. Apparel). Use / as a delimiter to specify up to 5-levels of hierarchy (e.g. Apparel/Men/T-Shirts).
            variant: 'monthly', // The variant of the product (e.g. Black).
            position: 1, // The product's position in a list or collection (e.g. 2)
            price: 6.95
        },
        yearly60: {
            baseProductId: 'yearly60',
            name: 'QuantiModo Plus Yearly Subscription',
            category: 'Subscription/End-User',  //The category to which the product belongs (e.g. Apparel). Use / as a delimiter to specify up to 5-levels of hierarchy (e.g. Apparel/Men/T-Shirts).
            variant: 'yearly', // The variant of the product (e.g. Black).
            position: 2, // The product's position in a list or collection (e.g. 2)
            price: 59.95
        }
    };
    quantimodoService.recordUpgradeProductImpression = function () {
        // id	text	Yes*	The product ID or SKU (e.g. P67890). *Either this field or name must be set.
        // name	text	Yes*	The name of the product (e.g. Android T-Shirt). *Either this field or id must be set.
        // list	text	No	The list or collection to which the product belongs (e.g. Search Results)
        // brand	text	No	The brand associated with the product (e.g. Google).
        // category	text	No	The category to which the product belongs (e.g. Apparel). Use / as a delimiter to specify up to 5-levels of hierarchy (e.g. Apparel/Men/T-Shirts).
        // variant	text	No	The variant of the product (e.g. Black).
        // position	integer	No	The product's position in a list or collection (e.g. 2).
        // price	currency	No	The price of a product (e.g. 29.20).
        // example: Analytics.addImpression(baseProductId, name, list, brand, category, variant, position, price);
        Analytics.addImpression(upgradeSubscriptionProducts.monthly7.baseProductId,
            upgradeSubscriptionProducts.monthly7.name, $rootScope.currentPlatform + ' Upgrade Options',
            config.appSettings.appDisplayName, upgradeSubscriptionProducts.monthly7.category,
            upgradeSubscriptionProducts.monthly7.variant, upgradeSubscriptionProducts.monthly7.position,
            upgradeSubscriptionProducts.monthly7.price);
        Analytics.addImpression(upgradeSubscriptionProducts.yearly60.baseProductId,
            upgradeSubscriptionProducts.yearly60.name, $rootScope.currentPlatform + ' Upgrade Options',
            config.appSettings.appDisplayName, upgradeSubscriptionProducts.yearly60.category,
            upgradeSubscriptionProducts.yearly60.variant, upgradeSubscriptionProducts.yearly60.position,
            upgradeSubscriptionProducts.yearly60.price);
        Analytics.pageView();
    };
    quantimodoService.recordUpgradeProductPurchase = function (baseProductId, transactionId, step, coupon) {
        //Analytics.addProduct(baseProductId, name, category, brand, variant, price, quantity, coupon, position);
        Analytics.addProduct(baseProductId, upgradeSubscriptionProducts[baseProductId].name,
            upgradeSubscriptionProducts[baseProductId].category, config.appSettings.appDisplayName,
            upgradeSubscriptionProducts[baseProductId].variant, upgradeSubscriptionProducts[baseProductId].price,
            1, coupon, upgradeSubscriptionProducts[baseProductId].position);

        // id	text	Yes*	The transaction ID (e.g. T1234). *Required if the action type is purchase or refund.
        // affiliation	text	No	The store or affiliation from which this transaction occurred (e.g. Google Store).
        // revenue	currency	No	Specifies the total revenue or grand total associated with the transaction (e.g. 11.99). This value may include shipping, tax costs, or other adjustments to total revenue that you want to include as part of your revenue calculations. Note: if revenue is not set, its value will be automatically calculated using the product quantity and price fields of all products in the same hit.
        // tax	currency	No	The total tax associated with the transaction.
        // shipping	currency	No	The shipping cost associated with the transaction.
        // coupon	text	No	The transaction coupon redeemed with the transaction.
        // list	text	No	The list that the associated products belong to. Optional.
        // step	integer	No	A number representing a step in the checkout process. Optional on checkout actions.
        // option	text	No	Additional field for checkout and checkout_option actions that can describe option information on the checkout page, like selected payment method.
        var revenue = upgradeSubscriptionProducts[baseProductId].price;
        var affiliation = config.appSettings.appDisplayName;
        var tax = 0;
        var shipping = 0;
        var list = config.appSettings.appDisplayName;
        var option = '';
        Analytics.trackTransaction(transactionId, affiliation, revenue, tax, shipping, coupon, list, step, option);
    };
    quantimodoService.getStudyLinks = function(predictorVariableName, outcomeVariableName){
        var subjectLine = "Help us discover the effect of " + predictorVariableName + " on " + outcomeVariableName;
        var studyLinkStatic = quantimodoService.getApiUrl() + "/api/v2/study?causeVariableName=" +
            encodeURIComponent(predictorVariableName) + '&effectVariableName=' + encodeURIComponent(outcomeVariableName);
        var bodyText = "Please join my study at " + studyLinkStatic + " .  Have a great day!";
        return {
            studyLinkFacebook : "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(studyLinkStatic),
            studyLinkTwitter : "https://twitter.com/home?status=" + encodeURIComponent(subjectLine + ' ' + studyLinkStatic + ' @quantimodo'),
            studyLinkGoogle : "https://plus.google.com/share?url=" + encodeURIComponent(studyLinkStatic),
            studyLinkEmail: "mailto:?subject=" + encodeURIComponent(subjectLine) + "&body=" + encodeURIComponent(bodyText)
        };
    };
    quantimodoService.getStudyLinkByVariableNames = function (causeVariableName, effectVariableName) {
        return quantimodoService.getApiUrl() + '/api/v2/study?causeVariableName=' + encodeURIComponent(causeVariableName) + '&effectVariableName=' + encodeURIComponent(effectVariableName);
    };
    quantimodoService.getWikipediaArticle = function(title){
        var deferred = $q.defer();
        wikipediaFactory.getArticle({
            term: title, // Searchterm
            //lang: '<LANGUAGE>', // (optional) default: 'en'
            //gsrlimit: '<GS_LIMIT>', // (optional) default: 10. valid values: 0-500
            pithumbsize: '200', // (optional) default: 400
            //pilimit: '<PAGE_IMAGES_LIMIT>', // (optional) 'max': images for all articles, otherwise only for the first
            exlimit: 'max', // (optional) 'max': extracts for all articles, otherwise only for the first
            //exintro: '1', // (optional) '1': if we just want the intro, otherwise it shows all sections
            redirects: ''
        }).then(function (repsonse) {
            if(repsonse.data.query) {
                deferred.resolve(repsonse.data.query.pages[0]);
            } else {
                var error = 'Wiki not found for ' + title;
                if (typeof Bugsnag !== "undefined") { Bugsnag.notify(error, error, {}, "error"); }
                console.error(error);
                deferred.reject(error);
            }
        }).catch(function (error) {
            console.error(error);
            deferred.reject(error);
            //on error
        });
        return deferred.promise;
    };
    quantimodoService.goToLoginIfNecessary = function(goToState){
        quantimodoService.refreshUserUsingAccessTokenInUrlIfNecessary();
        if(!weHaveUserOrAccessToken()){
            if(!goToState){goToState = $state.current.name;}
            console.debug('Setting afterLoginGoToState to ' + goToState);
            quantimodoService.setLocalStorageItem('afterLoginGoToState', goToState);
            $state.go('app.login');
            return true;
        }
        return false;
    };
    quantimodoService.getPrimaryOutcomeVariable = function(){
        if(config.appSettings.primaryOutcomeVariableDetails){ return config.appSettings.primaryOutcomeVariableDetails;}
        var variables = {
            "Overall Mood" : {
                "id" : 1398,
                "name" : "Overall Mood",
                "variableName": "Overall Mood",
                variableCategoryName : "Mood",
                "userVariableDefaultUnitAbbreviatedName" : "/5",
                "combinationOperation": "MEAN",
                "valence": "positive",
                "unitName": "1 to 5 Rating",
                "ratingOptionLabels" : ["Depressed", "Sad", "OK", "Happy", "Ecstatic"],
                "ratingValueToTextConversionDataSet": {1: "depressed", 2: "sad", 3: "ok", 4: "happy", 5: "ecstatic"},
                "ratingTextToValueConversionDataSet" : {"depressed" : 1, "sad" : 2, "ok" : 3, "happy" : 4, "ecstatic": 5},
                trackingQuestion: "How are you?",
                averageText:"Your average mood is ",
            },
            "Energy Rating" : {
                id : 108092,
                name : "Energy Rating",
                variableName: "Energy Rating",
                variableCategoryName : "Emotions",
                unitAbbreviatedName : "/5",
                combinationOperation: "MEAN",
                positiveOrNegative: 'positive',
                unitName: '1 to 5 Rating',
                ratingOptionLabels : ['1', '2', '3', '4', '5'],
                ratingValueToTextConversionDataSet: {1: "1", 2: "2", 3: "3", 4: "4", 5: "5"},
                ratingTextToValueConversionDataSet : {"1" : 1, "2" : 2, "3" : 3, "4" : 4, "5" : 5},
                trackingQuestion:"How is your energy level right now?",
                averageText:"Your average energy level is ",
            }
        };
        if(config.appSettings.primaryOutcomeVariableName){return variables[config.appSettings.primaryOutcomeVariableName];}
        return variables['Overall Mood'];
    };
    quantimodoService.ratingImages = {
        positive : [
            'img/rating/face_rating_button_256_depressed.png',
            'img/rating/face_rating_button_256_sad.png',
            'img/rating/face_rating_button_256_ok.png',
            'img/rating/face_rating_button_256_happy.png',
            'img/rating/face_rating_button_256_ecstatic.png'
        ],
        negative : [
            'img/rating/face_rating_button_256_ecstatic.png',
            'img/rating/face_rating_button_256_happy.png',
            'img/rating/face_rating_button_256_ok.png',
            'img/rating/face_rating_button_256_sad.png',
            'img/rating/face_rating_button_256_depressed.png'
        ],
        numeric : [
            'img/rating/numeric_rating_button_256_1.png',
            'img/rating/numeric_rating_button_256_2.png',
            'img/rating/numeric_rating_button_256_3.png',
            'img/rating/numeric_rating_button_256_4.png',
            'img/rating/numeric_rating_button_256_5.png'
        ]
    };
    quantimodoService.addToFavoritesUsingVariableObject = function (variableObject) {
        var trackingReminder = {};
        trackingReminder.variableId = variableObject.id;
        trackingReminder.variableName = variableObject.name;
        trackingReminder.unitAbbreviatedName = variableObject.userVariableDefaultUnitAbbreviatedName;
        trackingReminder.valence = variableObject.valence;
        trackingReminder.variableCategoryName = variableObject.variableCategoryName;
        trackingReminder.reminderFrequency = 0;
        if($rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise){
            var message = 'Got deletion request before last reminder refresh completed';
            console.debug(message);
            $rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise.reject();
            $rootScope.lastRefreshTrackingRemindersAndScheduleAlarmsPromise = null;
        }
        if ((trackingReminder.unitAbbreviatedName !== '/5' && trackingReminder.variableName !== "Blood Pressure")) {
            $state.go('app.favoriteAdd', {variableObject: variableObject, fromState: $state.current.name, fromUrl: window.location.href, doneState: 'app.favorites'});
            return;
        }
        quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('trackingReminders', trackingReminder)
            .then(function() {
                // We should wait unit this is in local storage before going to Favorites page so they don't see a blank screen
                $state.go('app.favorites', {trackingReminder: trackingReminder, fromState: $state.current.name, fromUrl: window.location.href});
                quantimodoService.syncTrackingReminders();
            });
    };
    quantimodoService.addToRemindersUsingVariableObject = function (variableObject, options) {
        var doneState = config.appSettings.appDesign.defaultState;
        if(options.doneState){doneState = options.doneState;}
        if($rootScope.appSettings.appDesign.onboarding.active && $rootScope.appSettings.appDesign.onboarding.active[0] &&
            $rootScope.appSettings.appDesign.onboarding.active[0].id.toLowerCase().indexOf('reminder') !== -1){
            $rootScope.appSettings.appDesign.onboarding.active[0].title = $rootScope.appSettings.appDesign.onboarding.active[0].title.replace('Any', 'More');
            $rootScope.appSettings.appDesign.onboarding.active[0].addButtonText = "Add Another";
            $rootScope.appSettings.appDesign.onboarding.active[0].nextPageButtonText = "All Done";
            $rootScope.appSettings.appDesign.onboarding.active[0].bodyText = "Great job!  Now you'll be able to instantly record " +
                variableObject.name + " in the Reminder Inbox. <br><br>   Want to add any more " +
                variableObject.variableCategoryName.toLowerCase() + '?';
            quantimodoService.setLocalStorageItem('onboardingPages', JSON.stringify($rootScope.appSettings.appDesign.onboarding.active));
        }
        var trackingReminder = {};
        trackingReminder.variableId = variableObject.id;
        trackingReminder.variableName = variableObject.name;
        trackingReminder.unitAbbreviatedName = variableObject.userVariableDefaultUnitAbbreviatedName;
        trackingReminder.valence = variableObject.valence;
        trackingReminder.variableCategoryName = variableObject.variableCategoryName;
        trackingReminder.reminderFrequency = 86400;
        trackingReminder.reminderStartTime = quantimodoService.getUtcTimeStringFromLocalString("19:00:00");
        var skipReminderSettings = false;
        if(variableObject.variableName === "Blood Pressure"){skipReminderSettings = true;}
        if(options.skipReminderSettingsIfPossible){
            if(variableObject.userVariableDefaultUnitAbbreviatedName === '/5'){skipReminderSettings = true;}
            if(variableObject.userVariableDefaultUnitAbbreviatedName === 'serving'){
                skipReminderSettings = true;
                trackingReminder.defaultValue = 1;
            }
        }
        if (!skipReminderSettings) {
            $state.go('app.reminderAdd', {variableObject: variableObject, doneState: doneState});
            return;
        }
        quantimodoService.addToOrReplaceElementOfLocalStorageItemByIdOrMoveToFront('trackingReminderSyncQueue', trackingReminder)
            .then(function() {
                // We should wait unit this is in local storage before going to Favorites page so they don't see a blank screen
                $state.go(doneState, {trackingReminder: trackingReminder});
                quantimodoService.syncTrackingReminders();
            });
    };
    quantimodoService.getDefaultReminders = function(){
        if(config.appSettings.defaultReminders){return config.appSettings.defaultReminders;}
        if(config.appSettings.defaultRemindersType === 'medication'){
            return [
                {
                    variableName : 'Heart Rate (Pulse)',
                    defaultValue :  null,
                    unitAbbreviatedName: 'bpm',
                    reminderFrequency : 0,
                    icon: 'ion-heart',
                    variableCategoryName : 'Vital Signs'
                },
                {
                    variableName: 'Blood Pressure',
                    icon: 'ion-heart',
                    unitAbbreviatedName: 'mmHg',
                    reminderFrequency : 0,
                    defaultValue :  null,
                    variableCategoryName : 'Vital Signs'
                },
                {
                    variableName: 'Core Body Temperature',
                    icon: null,
                    unitAbbreviatedName: 'C',
                    reminderFrequency : 0,
                    defaultValue :  null,
                    variableCategoryName : 'Vital Signs'
                },
                {
                    variableName: 'Oxygen Saturation',
                    icon: null,
                    unitAbbreviatedName: '%',
                    reminderFrequency : 0,
                    defaultValue :  null,
                    variableCategoryName : 'Vital Signs'
                },
                {
                    variableName: 'Respiratory Rate (Ventilation/Breath/RR/Respiration)',
                    icon: null,
                    unitAbbreviatedName: '/minute',
                    reminderFrequency : 0,
                    defaultValue :  null,
                    variableCategoryName : 'Vital Signs'
                },
                {
                    variableName: 'Weight',
                    icon: null,
                    unitAbbreviatedName: 'lb',
                    reminderFrequency : 0,
                    defaultValue :  null,
                    variableCategoryName : 'Physique'
                },
                {
                    variableName: 'Height',
                    icon: null,
                    unitAbbreviatedName: 'cm',
                    reminderFrequency : 0,
                    defaultValue :  null,
                    variableCategoryName : 'Physique'
                },
                {
                    variableName: 'Body Mass Index or BMI',
                    icon: null,
                    unitAbbreviatedName: 'index',
                    reminderFrequency : 0,
                    defaultValue :  null,
                    variableCategoryName : 'Physique'
                },
                {
                    variableName: 'Blood Glucose Sugar',
                    icon: null,
                    unitAbbreviatedName: 'mg/dL',
                    reminderFrequency : 0,
                    defaultValue :  null,
                    variableCategoryName : 'Vital Signs'
                }
            ];
        }
        return null;
    };
    function processTrackingReminders(trackingReminders, variableCategoryName) {
        trackingReminders = quantimodoService.filterByStringProperty(trackingReminders, 'variableCategoryName', variableCategoryName);
        if(!trackingReminders || !trackingReminders.length){return {};}
        for(var i = 0; i < trackingReminders.length; i++){
            trackingReminders[i].total = null;
            trackingReminders[i].valueAndFrequencyTextDescriptionWithTime = quantimodoService.getValueAndFrequencyTextDescriptionWithTime(trackingReminders[i]);
            if(typeof trackingReminders[i].defaultValue === "undefined"){trackingReminders[i].defaultValue = null;}
        }
        trackingReminders = quantimodoService.attachVariableCategoryIcons(trackingReminders);
        var reminderTypesArray = {allTrackingReminders: trackingReminders};
        reminderTypesArray.favorites = trackingReminders.filter(function( trackingReminder ) {return trackingReminder.reminderFrequency === 0;});
        reminderTypesArray.trackingReminders = trackingReminders.filter(function( trackingReminder ) {
            return trackingReminder.reminderFrequency !== 0 && trackingReminder.valueAndFrequencyTextDescription.toLowerCase().indexOf('ended') === -1;
        });
        reminderTypesArray.archivedTrackingReminders = trackingReminders.filter(function( trackingReminder ) {
            return trackingReminder.reminderFrequency !== 0 && trackingReminder.valueAndFrequencyTextDescription.toLowerCase().indexOf('ended') !== -1;
        });
        return reminderTypesArray;
    }
    quantimodoService.getAllReminderTypes = function(variableCategoryName, type){
        var deferred = $q.defer();
        quantimodoService.getTrackingRemindersDeferred(variableCategoryName).then(function (trackingReminders) {
            var reminderTypesArray = processTrackingReminders(trackingReminders, variableCategoryName);
            if(type){deferred.resolve(reminderTypesArray[type]);} else {deferred.resolve(reminderTypesArray);}
        });
        return deferred.promise;
    };
    quantimodoService.convertTrackingReminderToVariableObject = function(trackingReminder){
        var variableObject = JSON.parse(JSON.stringify(trackingReminder));
        variableObject.id = trackingReminder.variableId;
        variableObject.name = trackingReminder.variableName;
        return variableObject;
    };
    quantimodoService.actionSheetButtons = {
        history: { text: '<i class="icon ' + quantimodoService.ionIcons.history + '"></i>History'},
        analysisSettings: { text: '<i class="icon ' + quantimodoService.ionIcons.settings + '"></i>' + 'Analysis Settings'},
        recordMeasurement: { text: '<i class="icon ' + quantimodoService.ionIcons.recordMeasurement + '"></i>Record Measurement'},
        addReminder: { text: '<i class="icon ' + quantimodoService.ionIcons.reminder + '"></i>Add Reminder'},
        charts: { text: '<i class="icon ' + quantimodoService.ionIcons.charts + '"></i>Charts'},
        settings: { text: '<i class="icon ' + quantimodoService.ionIcons.settings + '"></i>Settings'},
        help: { text: '<i class="icon ' + quantimodoService.ionIcons.help + '"></i>Help'}
    };
    quantimodoService.addImagePaths = function(object){
        if(object.variableCategoryName){
            var pathPrefix = 'img/variable_categories/' + object.variableCategoryName.toLowerCase().replace(' ', '-');
            if(!object.pngPath){object.pngPath = pathPrefix + '.png';}
            if(!object.svgPath){object.svgPath = pathPrefix + '.svg';}
        }
        return object;
    };
    function setupExplanations(){
        quantimodoService.explanations = {
            predictorSearch: {
                title: "Select Predictor",
                textContent: "Search for a predictor like a food or treatment that you want to know the effects of..."
            },
            outcomeSearch: {
                title: "Select Outcome",
                textContent: "Select an outcome variable to be optimized like overall mood or sleep quality..."
            },
            locationAndWeatherTracking: {
                title: "Location and Weather Tracking",
                textContent: quantimodoService.variableCategories.Location.moreInfo
            },
            minimumAllowedValue: {
                title: "Minimum Allowed Value",
                explanation: "The minimum allowed value for measurements. While you can record a value below this minimum, it will be excluded from the correlation analysis.",
            },
            maximumAllowedValue: {
                title: "Maximum Allowed Value",
                explanation: "The maximum allowed value for measurements.  While you can record a value above this maximum, it will be excluded from the correlation analysis.",
            },
            onsetDelayInHours: {
                title: "Onset Delay",
                unitName: "Hours",
                explanation: "An outcome is always preceded by the predictor or stimulus. The amount of time that elapses after the predictor/stimulus event before the outcome as perceived by a self-tracker is known as the “onset delay”.  For example, the “onset delay” between the time a person takes an aspirin (predictor/stimulus event) and the time a person perceives a change in their headache severity (outcome) is approximately 30 minutes.",
            },
            onsetDelay: {
                title: "Onset Delay",
                unitName: "Seconds",
                explanation: "An outcome is always preceded by the predictor or stimulus. The amount of time that elapses after the predictor/stimulus event before the outcome as perceived by a self-tracker is known as the “onset delay”.  For example, the “onset delay” between the time a person takes an aspirin (predictor/stimulus event) and the time a person perceives a change in their headache severity (outcome) is approximately 30 minutes.",
            },
            durationOfActionInHours: {
                title: "Duration of Action",
                unitName: "Hours",
                explanation: "The amount of time over which a predictor/stimulus event can exert an observable influence on an outcome variable’s value. For instance, aspirin typically decreases headache severity for approximately four hours (duration of action) following the onset delay.",
            },
            durationOfAction: {
                title: "Duration of Action",
                unitName: "Seconds",
                explanation: "The amount of time over which a predictor/stimulus event can exert an observable influence on an outcome variable’s value. For instance, aspirin typically decreases headache severity for approximately four hours (duration of action) following the onset delay.",
            },
            fillingValue: {
                title: "Filling Value",
                explanation: "When it comes to analysis to determine the effects of this variable, knowing when it did not occur is as important as knowing when it did occur. For example, if you are tracking a medication, it is important to know when you did not take it, but you do not have to log zero values for all the days when you haven't taken it. Hence, you can specify a filling value (typically 0) to insert whenever data is missing.",
            },
            combinationOperation: {
                title: "Combination Method",
                explanation: "How multiple measurements are combined over time.  We use the average (or mean) for things like your weight.  Summing is used for things like number of apples eaten.",
            },
            defaultValue: {
                title: "Default Value",
                explanation: "If specified, there will be a button that allows you to quickly record this value.",
            },
            experimentStartTime: {
                title: "Analysis Start Date",
                explanation: "Data prior to this date will not be used in analysis.",
            },
            experimentEndTime: {
                title: "Analysis End Date",
                explanation: "Data after this date will not be used in analysis.",
            },
            thumbs: {
                title: "Help Me Learn",
                explanation: "I'm really good at finding correlations and even compensating for various onset delays and durations of action. " +
                "However, you're much better than me at knowing if there's a way that a given factor could plausibly influence an outcome. " +
                "You can help me learn and get better at my predictions by pressing the thumbs down button for relationships that you don't think could possibly be causal.",
            }
        };
    }
    quantimodoService.showMaterialAlert = function(title, textContent, ev){
        function AlertDialogController($scope, $mdDialog, dataToPass) {
            var self = this;
            self.title = dataToPass.title;
            self.textContent = dataToPass.textContent;
            $scope.hide = function() {$mdDialog.hide();};
            $scope.cancel = function() {$mdDialog.cancel();};
            $scope.answer = function(answer) {$mdDialog.hide(answer);};
        }
        $mdDialog.show({
            controller: AlertDialogController,
            controllerAs: 'ctrl',
            templateUrl: 'templates/dialogs/robot-alert.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: false,
            fullscreen: false,
            locals: {dataToPass: {title: title, textContent: textContent}}
        })
        .then(function(answer) {
            if(answer === "help"){$state.go('app.help');}
            //$scope.status = 'You said the information was "' + answer + '".';
        }, function() {
            //$scope.status = 'You cancelled the dialog.';
        });
    };
    quantimodoService.showMaterialConfirmationDialog = function(title, textContent, yesCallbackFunction, noCallbackFunction, ev){
        function ConfirmationDialogController($scope, $mdDialog, dataToPass) {
            var self = this;
            self.title = dataToPass.title;
            self.textContent = dataToPass.textContent;
            $scope.hide = function() {$mdDialog.hide();};
            $scope.cancel = function() {$mdDialog.cancel();};
            $scope.answer = function(answer) {$mdDialog.hide(answer);};
        }
        $mdDialog.show({
            controller: ConfirmationDialogController,
            controllerAs: 'ctrl',
            templateUrl: 'templates/dialogs/robot-confirmation.html',
            parent: angular.element(document.body),
            targetEvent: ev,
            clickOutsideToClose: false,
            fullscreen: false,
            locals: {dataToPass: {title: title, textContent: textContent}}
        }).then(function(answer) {
            if(answer === "help"){$state.go('app.help');}
            if(answer === 'yes'){yesCallbackFunction();}
            if(answer === 'no' && noCallbackFunction){noCallbackFunction();}
        }, function() {
            if(noCallbackFunction){noCallbackFunction();}
        });
    };
    quantimodoService.validationFailure = function (message, object) {
        quantimodoService.showMaterialAlert(message);
        console.error(message);
        if (typeof Bugsnag !== "undefined") {Bugsnag.notify(message, "measurement is " + JSON.stringify(object), {}, "error");}
    };
    quantimodoService.valueIsValid = function(object, value){
        var message;
        if($rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName] && typeof $rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName].minimumValue !== "undefined" && $rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName].minimumValue !== null) {
            if(value < $rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName].minimumValue){
                message = $rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName].minimumValue + ' is the smallest possible value for the unit ' + $rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName].name + ".  Please select another unit or value.";
                quantimodoService.validationFailure(message);
                return false;
            }
        }
        if($rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName] && typeof $rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName].maximumValue !== "undefined" && $rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName].maximumValue !== null) {
            if(value > $rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName].maximumValue){
                message = $rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName].maximumValue + ' is the largest possible value for the unit ' + $rootScope.unitsIndexedByAbbreviatedName[object.unitAbbreviatedName].name + ".  Please select another unit or value.";
                quantimodoService.validationFailure(message);
                return false;
            }
        }
        return true;
    };
    quantimodoService.getInputType = function(unitAbbreviatedName, valence, variableName) {
        var inputType = 'value';
        if (variableName === 'Blood Pressure') {inputType = 'bloodPressure';}
        if (unitAbbreviatedName === '/5') {
            inputType = 'oneToFiveNumbers';
            if (valence === 'positive') {inputType = 'happiestFaceIsFive';}
            if (valence === 'negative') {inputType = 'saddestFaceIsFive';}
        }
        if (unitAbbreviatedName === 'yes/no') {inputType = 'yesOrNo';}
        return inputType;
    };
    quantimodoService.removeArrayElementsWithDuplicateIds = function(array) {
        var a = array.concat();
        for(var i = 0; i < a.length; i++) {
            for(var j = i + 1; j < a.length; j++) {
                if(!a[i]){console.error('a[i] not defined!');}
                if(!a[j]){
                    console.error('a[j] not defined!');
                    return a;
                }
                if(a[i].id === a[j].id) {
                    a.splice(j--, 1);
                }
            }
        }
        return a;
    };
    var deleteAllMeasurementsForVariable = function(variableObject) {
        quantimodoService.showBlackRingLoader();
        // Delete all measurements for a variable
        quantimodoService.deleteAllMeasurementsForVariableDeferred(variableObject.id).then(function() {
            // If primaryOutcomeVariableName, delete local storage measurements
            if ($rootScope.variableName === quantimodoService.getPrimaryOutcomeVariable().name) {
                quantimodoService.setLocalStorageItem('primaryOutcomeVariableMeasurements',[]);
                quantimodoService.setLocalStorageItem('measurementsQueue',[]);
                quantimodoService.setLocalStorageItem('averagePrimaryOutcomeVariableValue',0);
                localStorage.setItem('lastMeasurementSyncTime', 0);
            }
            quantimodoService.hideLoader();
            $state.go(config.appSettings.appDesign.defaultState);
            console.debug("All measurements for " + variableObject.name + " deleted!");
        }, function(error) {
            quantimodoService.hideLoader();
            console.debug('Error deleting measurements: '+ JSON.stringify(error));
        });
    };
    quantimodoService.showDeleteAllMeasurementsForVariablePopup = function(variableObject, ev){
        var title = 'Delete all ' + variableObject.name + " measurements?";
        var textContent = 'This cannot be undone!';
        function yesCallback() {deleteAllMeasurementsForVariable(variableObject);}
        function noCallback() {}
        quantimodoService.showMaterialConfirmationDialog(title, textContent, yesCallback, noCallback, ev);
    };
    quantimodoService.sendToLogin = function(comeBackAfterLogin){
        if(comeBackAfterLogin){
            quantimodoService.setLocalStorageItem('afterLoginGoTo', window.location.href);
            console.debug("set afterLoginGoTo to " + window.location.href);
        }
        quantimodoService.completelyResetAppState();
        $state.go("app.login");
    };
    quantimodoService.highchartsReflow = function() {
        // Fixes chart width
        //$(window).resize(); This doesn't seem to do anything
        if(!$rootScope.reflowScheduled){
            $rootScope.reflowScheduled = true; // Avoids Error: [$rootScope:inprog] $digest already in progress
            var seconds = 0.1;
            //console.debug('Setting highchartsReflow timeout for ' + seconds + ' seconds');
            $timeout(function() {
                //console.debug('executing broadcast(highchartsng.reflow)');
                $rootScope.$broadcast('highchartsng.reflow');
                $rootScope.reflowScheduled = false;
            }, seconds * 1000);
            //$scope.$broadcast('highchartsng.reflow'); This doesn't seem to do anything
        } else {
            console.debug('broadcast(highchartsng.reflow) already scheduled');
        }
    };
    // Doesn't work yet
    function generateMovingAverageTimeSeries(rawMeasurements) {
        var smoothedMeasurements = [];
        var weightedPeriod = 10;
        var sum = 0;
        var j;
        var numberOfMeasurements = rawMeasurements.length;
        for (var i = 1; i <= numberOfMeasurements - weightedPeriod; i++) {
            if(numberOfMeasurements < 1000){
                for(j = 0; j < weightedPeriod; j++ ) {
                    sum += rawMeasurements[ i + j ].y * ( weightedPeriod - j );
                }
                rawMeasurements[i].y = sum / (( weightedPeriod * ( weightedPeriod + 1 )) / 2 );
            } else {
                for(j = 0; j < weightedPeriod; j++ ) {
                    sum += rawMeasurements[ i + j ][1] * ( weightedPeriod - j );
                }
                rawMeasurements[i][1] = sum / (( weightedPeriod * ( weightedPeriod + 1 )) / 2 );
            }
            smoothedMeasurements.push(rawMeasurements[i]);
        }
        return smoothedMeasurements;
    }
    quantimodoService.goToStudyPageViaCorrelationObject = function(correlationObject){
        $rootScope.correlationObject = correlationObject;
        localStorage.setItem('lastStudy', JSON.stringify(correlationObject));
        $state.go('app.study', {correlationObject: correlationObject});
    };
    quantimodoService.getPlanFeatureCards = function () {
        var planFeatureCards = [
            {
                title: 'QuantiModo Lite',
                headerColor: "#f2f9ff",
                backgroundColor: "#f2f9ff",
                subtitle: 'Improve your life!',
                featuresBasicList: [
                    {
                        title: '3 month data history',
                    },
                ],
                featuresAvatarList: [
                    {
                        title: 'Emotion Tracking',
                        subtitle: 'Turn data into happiness!',
                        moreInfo: $rootScope.variableCategories.Emotions.moreInfo,
                        image: $rootScope.variableCategories.Emotions.imageUrl,
                    },
                    {
                        title: 'Track Symptoms',
                        subtitle: 'in just seconds a day',
                        moreInfo: $rootScope.variableCategories.Symptoms.moreInfo,
                        image: $rootScope.variableCategories.Symptoms.imageUrl,
                    },
                    {
                        title: 'Track Diet',
                        subtitle: 'Identify dietary triggers',
                        moreInfo: $rootScope.variableCategories.Foods.moreInfo,
                        image: $rootScope.variableCategories.Foods.imageUrl,
                    },
                    {
                        title: 'Treatment Tracking',
                        subtitle: 'with reminders',
                        moreInfo: $rootScope.variableCategories.Treatments.moreInfo,
                        image: $rootScope.variableCategories.Treatments.imageUrl,
                    },
                ],
                priceHtml: "Price: Free forever",
                buttonText: "Sign Up Now",
                buttonClass: "button button-balanced"
            },
            {
                title: 'QuantiModo Plus',
                headerColor: "#f0df9a",
                backgroundColor: "#ffeda5",
                subtitle: 'Perfect your life!',
                featuresAvatarList: [
                    {
                        title: 'Import from Apps',
                        subtitle: 'Facebook, Google Calendar, Runkeeper, Github, Sleep as Android, MoodiModo, and even ' +
                        'the weather!',
                        moreInfo: "Automatically import your data from Google Calendar, Facebook, Runkeeper, " +
                        "QuantiModo, Sleep as Android, MoodiModo, Github, and even the weather!",
                        image: 'img/features/smartphone.svg'
                    },
                    {
                        title: 'Import from Devices',
                        subtitle: 'Fitbit, Jawbone Up, Withings...',
                        moreInfo: "Automatically import your data from Fitbit, Withings, Jawbone.",
                        image: 'img/features/smartwatch.svg'
                    },
                    {
                        title: 'Sync Across Devices',
                        subtitle: 'Web, Chrome, Android, and iOS',
                        moreInfo: "Any of your QuantiModo-supported apps will automatically sync with any other app " +
                        "on the web, Chrome, Android, and iOS.",
                        image: 'img/features/devices.svg'
                    },
                    {
                        title: 'Unlimited History',
                        subtitle: 'Lite gets 3 months',
                        moreInfo: "Premium accounts can see unlimited historical data (Free accounts can see only " +
                        "the most recent three months). This is great for seeing long-term trends in your " +
                        "productivity or getting totals for the entire year.",
                        image: 'img/features/calendar.svg'
                    },
                    {
                        title: 'Location Tracking',
                        subtitle: 'Automatically log places',
                        moreInfo: $rootScope.variableCategories.Location.moreInfo,
                        image: $rootScope.variableCategories.Location.imageUrl,
                    },
                    {
                        title: 'Purchase Tracking',
                        subtitle: 'Automatically log purchases',
                        moreInfo: $rootScope.variableCategories.Payments.moreInfo,
                        image: $rootScope.variableCategories.Payments.imageUrl,
                    },
                    {
                        title: 'Weather Tracking',
                        subtitle: 'Automatically log weather',
                        moreInfo: $rootScope.variableCategories.Environment.moreInfo,
                        image: $rootScope.variableCategories.Environment.imageUrl,
                    },
                    {
                        title: 'Productivity Tracking',
                        subtitle: 'Passively track app usage',
                        moreInfo: "You can do this by installing and connecting Rescuetime on the Import Data page.  Rescuetime is a program" +
                        " that runs on your computer & passively tracks of productivity and app usage.",
                        image: 'img/features/rescuetime.png',
                    },
                    {
                        title: 'Sleep Tracking',
                        subtitle: 'Automatically track sleep duration and quality',
                        moreInfo: $rootScope.variableCategories.Sleep.moreInfo,
                        image: $rootScope.variableCategories.Sleep.imageUrl,
                    },
                    {
                        title: 'Vital Signs',
                        subtitle: 'Keep your heart healthy',
                        moreInfo: "I can get your heart rate data from the Fitbit Charge HR, Fitbit Surge.  " +
                        "Resting heart rate is a good measure of general fitness, and heart rate during " +
                        "workouts show intensity.  I can also talk to Withing's bluetooth blood pressure monitor. ",
                        image: 'img/features/heart-like.png',
                    },
                    {
                        title: 'Physique',
                        subtitle: 'Monitor weight and body fat',
                        moreInfo: $rootScope.variableCategories.Physique.moreInfo,
                        image: $rootScope.variableCategories.Physique.imageUrl
                    },
                    {
                        title: 'Fitness Tracking',
                        subtitle: 'Steps and physical activity',
                        moreInfo: $rootScope.variableCategories['Physical Activity'].moreInfo,
                        image: $rootScope.variableCategories['Physical Activity'].imageUrl
                    },
                    {
                        title: 'Advanced Analytics',
                        subtitle: 'See Top Predictors',
                        moreInfo: "See a list of the strongest predictors for any outcome.  See the values for each " +
                        "predictor that typically precede optimal outcomes.  Dive deeper by checking " +
                        "out the full study on any predictor and outcome combination.",
                        image: 'img/features/calendar.svg'
                    },
                ],
                priceHtml: "14 day free trial <br> Monthly: $6.99/month <br> Annual: $4.99/month (4 months free!)",
                buttonText: "Start My 14 Day Free Trial",
                buttonClass: "button button-large button-assertive"
            },
        ];
        if($rootScope.isIOS){
            planFeatureCards = JSON.parse(JSON.stringify(planFeatureCards).replace('Android, and iOS', 'any mobile device').replace(', Sleep as Android', ''));
        }
        return planFeatureCards;
    };
    quantimodoService.showBlackRingLoader = function(){
        console.debug("Showing loader because we called $ionicLoading.show");
        $ionicLoading.show({templateUrl: "templates/loaders/ring-loader.html", duration: 10000});
    };
    quantimodoService.hideLoader = function(){
        console.debug("Hiding loader because we called $ionicLoading.hide");
        $ionicLoading.hide();
    };
    quantimodoService.weShouldUseOAuthLogin = function(){
        return window.location.href.indexOf(quantimodoService.getApiUrl()) === -1;
    };
    quantimodoService.initializeApplication = function(appSettingsResponse){
        if(window.config){return;}
        window.config = {appSettings: (appSettingsResponse.data.appSettings) ? appSettingsResponse.data.appSettings : appSettingsResponse.data};
        window.config.appSettings.designMode = window.location.href.indexOf('configuration-index.html') !== -1;
        $rootScope.appSettings = window.config.appSettings;
        if(window.debugMode){console.debug('$rootScope.appSettings: ' + JSON.stringify($rootScope.appSettings));}
        if(!$rootScope.appSettings.appDesign.ionNavBarClass){ $rootScope.appSettings.appDesign.ionNavBarClass = "bar-positive"; }
        quantimodoService.getUserFromLocalStorageOrRefreshIfNecessary();
        quantimodoService.putCommonVariablesInLocalStorage();
        quantimodoService.backgroundGeolocationInit();
        quantimodoService.setupBugsnag();
        quantimodoService.getUserAndSetupGoogleAnalytics();
        if (location.href.toLowerCase().indexOf('hidemenu=true') !== -1) { $rootScope.hideNavigationMenu = true; }
        if ($rootScope.isMobile && $rootScope.localNotificationsEnabled) {
            console.debug("Going to try setting on trigger and on click actions for notifications when device is ready");
            $ionicPlatform.ready(function () {
                console.debug("Setting on trigger and on click actions for notifications");
                quantimodoService.setOnTriggerActionForLocalNotifications();
                quantimodoService.setOnClickActionForLocalNotifications(quantimodoService);
                quantimodoService.setOnUpdateActionForLocalNotifications();
            });
        }
    };
    quantimodoService.getUserFromLocalStorageOrRefreshIfNecessary = function(){
        if(quantimodoService.getUrlParameter('refreshUser')){
            quantimodoService.clearLocalStorage();
            quantimodoService.setLocalStorageItem('onboarded', true);
            quantimodoService.setLocalStorageItem('introSeen', true);
            $rootScope.user = null;
            $rootScope.refreshUser = false;
        }
        if(!$rootScope.user){ $rootScope.user = JSON.parse(quantimodoService.getLocalStorageItemAsString('user')); }
        quantimodoService.refreshUserUsingAccessTokenInUrlIfNecessary();
        if($rootScope.user){
            if(!$rootScope.user.trackLocation){ $rootScope.user.trackLocation = false; }
            if(!$rootScope.user.getPreviewBuilds){ $rootScope.user.getPreviewBuilds = false; }
            //qmSetupInPopup();
            //quantimodoService.humanConnect();
        }
    };
    quantimodoService.getPrivateConfigs = function(){
        $http.get('private_configs/default.private_config.json').success(function(response) {
            if(typeof response === "string"){console.error('private_configs/default.response.json not found');} else {window.private_keys = response;}
        });
    };
    quantimodoService.getDevCredentials = function(){
        return $http.get('private_configs/dev-credentials.json').success(function(response) {
            if(typeof response !== "string"){window.devCredentials = response;}
        });
    };
    quantimodoService.humanConnect = function(){
        var options = {
            clientUserId: encodeURIComponent($rootScope.user.id),
            clientId: 'e043bd14114cb0fb5f0b358f3a8910545ca9525e',
            publicToken: ($rootScope.user.humanApiPublicToken) ? $rootScope.user.humanApiPublicToken : '',
            finish: function(err, sessionTokenObject) {
                /* Called after user finishes connecting their health data */
                //POST sessionTokenObject as-is to your server for step 2.
                quantimodoService.post('api/v1/human/connect/finish', [], sessionTokenObject).then(function (response) {
                    console.log(response);
                    $rootScope.user = response.data.user;
                });
                // Include code here to refresh the page.
            },
            close: function() {
                /* (optional) Called when a user closes the popup
                 without connecting any data sources */
            },
            error: function(err) {
                /* (optional) Called if an error occurs when loading
                 the popup. */
            }
        };
        HumanConnect.open(options);
    };
    quantimodoService.quantimodoConnectPopup = function(){
        window.QuantiModoImport.options = {
            clientUserId: encodeURIComponent($rootScope.user.id),
            clientId: config.appSettings.clientId,
            publicToken: ($rootScope.user.quantimodoPublicToken) ? $rootScope.user.quantimodoPublicToken : '',
            finish: function(err, sessionTokenObject) {
                /* Called after user finishes connecting their health data */
                //POST sessionTokenObject as-is to your server for step 2.
                quantimodoService.post('api/v1/quantimodo/connect/finish', [], sessionTokenObject, function (response) {
                    console.log(response);
                    $rootScope.user = response.data.user;
                });
                // Include code here to refresh the page.
            },
            close: function() {
                /* (optional) Called when a user closes the popup
                 without connecting any data sources */
            },
            error: function(err) {
                /* (optional) Called if an error occurs when loading
                 the popup. */
            }
        };
        window.QuantiModoImport.qmSetupInPopup();
    };
    return quantimodoService;
});
