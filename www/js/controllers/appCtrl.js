angular.module('starter')
    // Parent Controller
    // This controller runs before every one else
	.controller('AppCtrl', function($scope, $ionicModal, $timeout, $injector, utilsService, authService,
                                    measurementService, $ionicPopover, $ionicLoading, $state, $ionicHistory,
                                    QuantiModo, notificationService, $rootScope, localStorageService, reminderService,
                                    $ionicPopup, $ionicSideMenuDelegate) {

    // flags
    $scope.controller_name = "AppCtrl";
    $scope.menu = config.appSettings.menu;
    $scope.isLoggedIn  = false;
    $scope.showTrackingSubMenu = false;
    $scope.showReminderSubMenu = false;
    $scope.closeMenu = function() {
        $ionicSideMenuDelegate.toggleLeft(false);
    };

    var helpPopupMessages = config.appSettings.helpPopupMessages || false;

    $scope.$on('$ionicView.enter', function(e) {
        if(helpPopupMessages && typeof helpPopupMessages[location.hash] !== "undefined"){
            localStorageService.getItem('notShowHelpPopup',function(val){
                $scope.notShowHelpPopup = val ? JSON.parse(val) : false;

                // Had to add "&& e.targetScope !== $scope" to prevent duplicate popups
                if(!$scope.notShowHelpPopup && e.targetScope !== $scope){
                    $ionicPopup.show({
                        title: helpPopupMessages[location.hash],
                        subTitle: '',
                        scope:$scope,
                        template:'<label><input type="checkbox" ng-model="$parent.notShowHelpPopup" class="show-again-checkbox">Don\'t show these tips</label>',
                        buttons:[
                            {
                                text: 'OK',
                                type: 'button-positive',
                                onTap: function(){
                                    localStorageService.setItem('notShowHelpPopup',JSON.stringify($scope.notShowHelpPopup));
                                }
                            }
                        ]
                    });
                }
            });
        }
    });

    $scope.closeMenuIfNeeded = function(menuItem){
        if(menuItem.click){
            $scope[menuItem.click] && $scope[menuItem.click]();
        }
        else if(!menuItem.subMenuPanel){
            $scope.closeMenu();
        }
    };
    $scope.showHistorySubMenu = false;
    $scope.shoppingCarEnabled = config.shoppingCarEnabled;
    $rootScope.isSyncing = false;
    var $cordovaFacebook = {};


    $scope.isIOS = ionic.Platform.isIPad() || ionic.Platform.isIOS();
    $scope.isAndroid = ionic.Platform.isAndroid();
    $scope.isChrome = window.chrome ? true : false;

    if($scope.isIOS && $injector.has('$cordovaFacebook')){
        $cordovaFacebook = $injector.get('$cordovaFacebook');
    }

    /*Wrapper Config*/
    $scope.viewTitle = config.appSettings.appName;
    $scope.primaryOutcomeVariable = config.appSettings.primaryOutcomeVariable;
    $scope.primaryOutcomeVariableRatingOptions = config.getPrimaryOutcomeVariableOptions();
    $scope.primaryOutcomeVariableNumbers = config.getPrimaryOutcomeVariableOptions(true);
    $scope.welcomeText = config.appSettings.welcomeText;
    $scope.primaryOutcomeVariableTrackingQuestion = config.appSettings.primaryOutcomeVariableTrackingQuestion;
    $scope.primaryOutcomeVariableAverageText = config.appSettings.primaryOutcomeVariableAverageText;
    /*Wrapper Config End*/

    // when view is changed
    $scope.$on('$ionicView.enter', function(e) {
        if(e.targetScope && e.targetScope.controller_name && e.targetScope.controller_name === "TrackCtrl" && $scope.isLoggedIn){
            $scope.showCalender = true;
        } else {
        	$scope.showCalender = false;
        }
    });

    // load the calender popup
	$ionicPopover.fromTemplateUrl('templates/popover.html', {
		scope: $scope
	}).then(function(popover) {
		$scope.popover = popover;
	});

    $scope.fromDate = new Date();
    $scope.toDate = new Date();

    // when date is updated
    $scope.datePickerFromCallback = function (val) {
        if(typeof(val)==='undefined'){
            console.log('Date not selected');
        }else{
            $scope.fromDate = new Date(val);
            $scope.saveDates();
        }
    };

    $scope.datePickerToCallback = function (val) {
        if(typeof(val)==='undefined'){
            console.log('Date not selected');
        } else {
            $scope.toDate = new Date(val);
            $scope.saveDates();
        }
    };

    // update dates selected from calender
	$scope.saveDates = function(){
		var to = moment($scope.toDate).unix()*1000;
		var from = moment($scope.fromDate).unix()*1000;

		measurementService.setDates(to, from);
		$scope.popover.hide();
        $scope.init();
	};

    // show calender popup
	$scope.showCalenderF = function($event){
        $scope.popover.show($event);
        measurementService.getToDate(function(endDate){
            $scope.toDate = new Date(endDate);
            measurementService.getFromDate(function(fromDate){
                $scope.fromDate = new Date(fromDate);
            });
        });
	};

    var scheduleReminder = function(){
        if($rootScope.reminderToSchedule){

            reminderService.addNewReminder(
                $rootScope.reminderToSchedule.id,
                $rootScope.reminderToSchedule.reportedVariableValue,
                $rootScope.reminderToSchedule.interval,
                $rootScope.reminderToSchedule.name,
                $rootScope.reminderToSchedule.category,
                $rootScope.reminderToSchedule.unit,
                $rootScope.reminderToSchedule.combinationOperation)
            .then(function(){
                delete $rootScope.reminderToSchedule;
                console.log('reminder scheduled');
            }, function(err){
                console.log(err);
            });
        }
    };

    // when work on this activity is complete
    $scope.movePage = function(){
        // if user has seen the welcome screen before
        localStorageService.getItem('isWelcomed',function(isWelcomed) {

            if(isWelcomed  === true || isWelcomed === "true"){
                $rootScope.isWelcomed = true;
                console.log("isWelcomed is true. going");

                // move to tracking page
                if($state.current.name === "app.welcome" || $state.current.name === "app.login"){
                    $state.go(config.appSettings.defaultState);
                    $rootScope.hideMenu = false;
                }

                // don't animate, clear back history
                $ionicHistory.nextViewOptions({
                    disableAnimate: false,
                    disableBack: true
                });

                if(location.href.toLowerCase().indexOf('hidemenu=true') !== -1) {
                   $rootScope.skipMenu = true;
                }

                // redraw everything according to updated appstate
                $rootScope.$broadcast('redraw');
            } else {
                if(location.href.toLowerCase().indexOf('hidemenu=true') !== -1) {
                   $rootScope.skipMenu = true;
                }
            }
        });
    };

    // when user is logging out
    $scope.logout = function(){

        var startLogout = function(){
            $rootScope.isSyncing = false;
            if(ionic.Platform.platforms[0] !== "browser"){
                console.log('startLogout: Open the auth window via inAppBrowser.  Platform is ' + ionic.Platform.platforms[0]);
                var ref = window.open(config.getApiUrl() + '/api/v2/auth/logout','_blank', 'location=no,toolbar=yes');

                console.log('startLogout: listen to its event when the page changes');

                ref.addEventListener('loadstart', function(event) {
                    ref.close();
                    showPopup();
                });
            } else {
                showPopup();
            }
        };

        var showPopup = function(){
            $ionicPopup.show({
                title:'Clear local storage?',
                subTitle: 'Do you want do delete all data from local storage?',
                scope: $scope,
                buttons:[
                    {
                        text: 'No',
                        type: 'button-assertive',
                        onTap : afterLogoutNoLocal
                    },
                    {
                        text: 'Yes',
                        type: 'button-positive',
                        onTap: afterLogout
                    }
                ]

            });
        };

        var afterLogout = function(){

            // set flags
            $scope.isLoggedIn = false;
            localStorageService.clear();

            //clear notification
            notificationService.cancelNotifications();

            //Set out localstorage flag for welcome screen variables
            localStorageService.setItem('interval',true);
            localStorageService.setItem('primaryOutcomeVariableReportedWelcomeScreen',true);
            localStorageService.setItem('allData',JSON.stringify([]));

            // calculate primary outcome variable and chart data
            measurementService.calculateAveragePrimaryOutcomeVariableValue().then(function(){
                measurementService.calculateBothChart();
                measurementService.resetSyncFlag();
                //hard reload
                $state.go('app.welcome',{
                },{
                    reload:true
                });
            });

            if(window.chrome && window.chrome.extension && typeof window.chrome.identity === "undefined"){
                chrome.tabs.create({
                    url: config.getApiUrl() + "/api/v2/auth/logout"
                });
            }
        };

        var afterLogoutNoLocal = function(){
            // set flags
            $scope.isLoggedIn = false;

            //clear notification
            notificationService.cancelNotifications();

            //Set out localstorage flag for welcome screen variables
            localStorageService.setItem('isLoggedIn',false);
            localStorageService.setItem('interval',true);
            localStorageService.setItem('primaryOutcomeVariableReportedWelcomeScreen',true);
            localStorageService.deleteItem('accessToken');
            localStorageService.deleteItem('refreshToken');
            localStorageService.deleteItem('expiresAt');


            // calculate primary outcome variable and chart data
            measurementService.calculateAveragePrimaryOutcomeVariableValue().then(function(){
                measurementService.calculateBothChart();
                measurementService.resetSyncFlag();
                //hard reload
                $state.go('app.welcome',{
                },{
                    reload:true
                });
            });

            if(window.chrome && window.chrome.extension && typeof window.chrome.identity === "undefined"){
                chrome.tabs.create({
                    url: config.getApiUrl() + "/api/v2/auth/logout"
                });
            }
        };

        startLogout();

    };

    // User wants to login
    $scope.login = function(register) {

        localStorageService.setItem('isWelcomed', true);
        $rootScope.isWelcomed = true;

    	var url = config.getURL("api/oauth2/authorize", true);

        if (window.chrome && chrome.runtime && chrome.runtime.id) {
            console.log("$scope.login: Chrome Detected");
            authService.chromeLogin(url, register);
        }

		else if(ionic.Platform.is('browser')){
            console.log("$scope.login: Browser Detected");
            authService.browserLogin(url, register);
		} else {
            console.log("$scope.login: Browser and Chrome Not Detected.  Assuming mobile platform");
            authService.nonNativeMobileLogin(url, register);
        }
    };

    $scope.nativeLogin = function(platform, accessToken, register){
        localStorageService.setItem('isWelcomed', true);
        $rootScope.isWelcomed = true;

        showLoader('Talking to QuantiModo', 3000);
        authService.getJWTToken(platform, accessToken)
        .then(function(JWTToken){
            // success

            console.log("nativeLogin: Mobile device detected and platform is " + platform);
            var url = authService.generateV2OAuthUrl(JWTToken);

            $ionicLoading.hide();

            console.log('nativeLogin: open the auth window via inAppBrowser.');
            var ref = window.open(url,'_blank', 'location=no,toolbar=no');

            console.log('nativeLogin: listen to event when the page changes.');
            ref.addEventListener('loadstart', function(event) {

                console.log("nativeLogin: loadstart event", event);
                console.log('nativeLogin: check if changed url is the same as redirection url.');

                if(utilsService.startsWith(event.url, config.getRedirectUri())) {
                    
                    if(!utilsService.getUrlParameter(event.url,'error')) {
                        
                        var authorizationCode = authService.getAuthorizationCodeFromUrl(event);
                        
                        console.log('nativeLogin: Got authorization code: ' + authorizationCode + ' Closing inAppBrowser.');
                        ref.close();

                        var withJWT = true;
                        // get access token from authorization code
                        authService.fetchAccessTokenAndUserDetails(authorizationCode, withJWT);
                    } else {

                        console.log("nativeLogin: error occurred", utilsService.getUrlParameter(event.url, 'error'));

                        // close inAppBrowser
                        ref.close();
                    }
                }

            });
        }, function(){
            // error

            $ionicLoading.hide();
            console.log("error occurred, couldn't generate JWT");
        });
    };

    // log in with google
    $scope.googleLogin = function(){
        showLoader('Logging you in', 2000);
        window.plugins.googleplus.login({}, function (userData) {
            $ionicLoading.hide();
            console.log('successfully logged in');
            console.log('google->', JSON.stringify(userData));
            var accessToken = userData.accessToken;

            $scope.nativeLogin('google', accessToken);
        },
        function (msg) {
            $ionicLoading.hide();
            console.log("google login error", msg);
        });
    };

    $scope.googleLogout = function(){
        window.plugins.googleplus.logout(function (msg) {
          console.log("logged out of google!");
      }, function(fail){
          console.log("failed to logout", fail);
      });
    };

    // login with facebook
    $scope.facebookLogin = function(){
        showLoader('Logging you in', 2000);
        $cordovaFacebook.login(["public_profile", "email", "user_friends"])
        .then(function(success) {
            // success
            $ionicLoading.hide();
            console.log("facebookLogin_success");
            console.log("facebook->", JSON.stringify(success));
            var accessToken = success.authResponse.accessToken;

            $scope.nativeLogin('facebook', accessToken);
        }, function (error) {
            // error
            console.log("facebook login error", error);
        });
    };

    // when user click's skip button
    $scope.skipLogin = function(){
        localStorageService.setItem('isWelcomed', true);
        $rootScope.isWelcomed = true;
        // move to the next screen
        $scope.movePage();
    };

    // show loading spinner
    var showLoader = function(str, hideAfter){

        $ionicLoading.show({
            noBackdrop: true,
            template: '<p class="item-icon-left">'+str+'...<ion-spinner icon="lines"/></p>'
        });

        setTimeout(function(){
            $ionicLoading.hide();
        }, hideAfter);
    };

    // hide loader and move to next page
    var hideLoaderMove = function(){
        $ionicLoading.hide();
        $scope.movePage();
    };

    // calculate values for both of the charts
    var calculateChartValues = function(){
        measurementService.calculateBothChart().then(hideLoaderMove, hideLoaderMove);
    };

    // Demonstration of a sample API call
    $scope.init = function () {
        console.log("Main Constructor Start");

        showLoader('Logging you in', 2000);

        scheduleReminder();

        // try to get access token
    	authService.getAccessTokenFromAnySource().then(function(data) {

            console.log('got the access token');
            var accessToken = data.accessToken;

            // set flags
            $scope.isLoggedIn = true;

            localStorageService.getItem('user',function(user){
                if(!user){
                    console.log("Don't have a user.");
                    QuantiModo.getUser(function(user){

                        // set user data in local storage
                        localStorageService.setItem('user', JSON.stringify(user));

                        $scope.userName = user.displayName;
                    },function(err){

                        // error
                        console.log(err);
                    });
                }
                if(user){
                    user = JSON.parse(user);
                    console.log('user:' + user);
                    window.intercomSettings = {
                        app_id: "uwtx2m33",
                        name: user.displayName,
                        email: user.email,
                        user_id: user.id
                    };
                }

            });



            // update loader text
            $ionicLoading.hide();
            //showLoader('Syncing data');
            // sync data
            $scope.movePage();

            var syncEnabledStates = [
                'app.track',
                'app.welcome',
                'app.history',
                'app.login'
            ];

            if(syncEnabledStates.indexOf($state.current.name) !== -1 && config.appSettings.primaryOutcomeVariable){
                $rootScope.isSyncing = true;
                console.log('setting sync true');

                measurementService.syncData().then(function(){
                    console.log("sync complete");
                    $rootScope.isSyncing = false;

                    // update loader text
                    $ionicLoading.hide();
                    showLoader('Calculating stuff', 2000);

                    // calculate primary outcome variable values
                    measurementService.calculateAveragePrimaryOutcomeVariableValue().then(function(){
                        measurementService.getPrimaryOutcomeVariableValue().then(calculateChartValues, calculateChartValues);
                    });

                }, hideLoaderMove);
            }

        }, function () {

            //set flags
			$scope.isLoggedIn = false;
            $ionicLoading.hide();

            console.log('need to login again');
        });

    };

    $scope.$on('callAppCtrlInit', function(){
        console.log("calling init");
        
        // update everything
        $scope.init();
    });


    $scope.toggleTrackingSubMenu = function(){
        $scope.showTrackingSubMenu = !$scope.showTrackingSubMenu;
    };

    $scope.togglePredictorSearchSubMenu = function(){
        $scope.showPredictorSearchSubMenu = !$scope.showPredictorSearchSubMenu;
    };

    $scope.toggleOutcomePredictorSubMenu = function(){
        $scope.showOutcomePredictorSubMenu = !$scope.showOutcomePredictorSubMenu;
    };

    $scope.toggleHistorySubMenu = function(){
        $scope.showHistorySubMenu = !$scope.showHistorySubMenu;
    };

    $scope.toggleReminderSubMenu = function(){
        $scope.showReminderSubMenu = !$scope.showReminderSubMenu;
    };

    // call constructor
    $scope.init();

    var tokenInGetParams = utilsService.getUrlParameter(location.href, 'accessToken');

    if(!tokenInGetParams){
        tokenInGetParams = utilsService.getUrlParameter(location.href, 'access_token');
    }

    // redirection if already welcomed before
    var isWelcomed;
    localStorageService.getItem('isWelcomed',function(val){
        isWelcomed = val;
        console.log('isWelcomed ' + isWelcomed);
        if(isWelcomed  === true || isWelcomed === "true" || tokenInGetParams){
            $rootScope.isWelcomed = true;
            //$state.go(config.appSettings.defaultState);
        } else {
            console.log("isWelcomed is " + isWelcomed + ". Setting to true and going to welcome now.");
            localStorageService.setItem('isWelcomed', true);
            $rootScope.isWelcomed = true;
            $state.go('app.welcome');
        }

    });
});
