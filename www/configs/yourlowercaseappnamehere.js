window.config = {};

config.appSettings  = {
    appName : 'YourAppDisplayNameHere',
    cordovaLocalNotificationsEnabled : false,
    linkToChromeExtension : "https://chrome.google.com/webstore/detail/quantimodo-life-tracking/jioloifallegdkgjklafkkbniianjbgi",
    allowOffline : true,
    loaderImagePath : 'img/pop_tart_cat.gif',
    qmApiHostName: 'app.quantimo.do',
    settingsPageOptions :
    {
        showReminderFrequencySelector : true
    },

    defaultState : 'app.remindersInbox',
    welcomeState : 'app.welcome',

    primaryOutcomeVariable : 'Mood',

    appStorageIdentifier: 'YourAppDisplayNameHereData*',

    headline : 'Sync and Analyze Your Data',
    features: [
        ' - Automatically backup and sync your data across devices',
        ' - Track diet, treatments, symptoms, and anything else',
        ' - Analyze your data to see the strongest predictors of your mood'
    ],

    primaryOutcomeVariableDetails : {
        id : 1398,
        name : "Overall Mood",
        variableName: "Overall Mood",
        category : "Mood",
        abbreviatedUnitName : "/5",
        combinationOperation: "MEAN",
        description: 'positive',
        unitName: '1 to 5 Rating'
    },

    primaryOutcomeVariableRatingOptionLabels : [
        'Depressed',
        'Sad',
        'OK',
        'Happy',
        'Ecstatic'
    ],

    primaryOutcomeVariableRatingOptionLowercaseLabels : [
        'depressed',
        'sad',
        'ok',
        'happy',
        'ecstatic'
    ],

    positiveRatingImages : [
        'img/rating/ic_face_depressed.png',
        'img/rating/ic_face_sad.png',
        'img/rating/ic_face_ok.png',
        'img/rating/ic_face_happy.png',
        'img/rating/ic_face_ecstatic.png'
    ],

    negativeRatingImages : [
        'img/rating/ic_face_ecstatic.png',
        'img/rating/ic_face_happy.png',
        'img/rating/ic_face_ok.png',
        'img/rating/ic_face_sad.png',
        'img/rating/ic_face_depressed.png'
    ],

    numericRatingImages : [
        'img/rating/ic_1.png',
        'img/rating/ic_2.png',
        'img/rating/ic_3.png',
        'img/rating/ic_4.png',
        'img/rating/ic_5.png'
    ],

    welcomeText : "Let's start off by reporting your first mood below",
    primaryOutcomeVariableTrackingQuestion : "How are you?",
    primaryOutcomeVariableAverageText : "Your average mood is ",
    mobileNotificationImage : "file://img/icons/icon_128.png",
    mobileNotificationText : "Time to track!",
    ratingValueToTextConversionDataSet: {
        "1": "depressed",
        "2": "sad",
        "3": "ok",
        "4": "happy",
        "5": "ecstatic"
    },
    ratingTextToValueConversionDataSet : {
        "depressed" : 1,
        "sad" : 2,
        "ok" : 3,
        "happy" : 4,
        "ecstatic": 5
    },
    backgroundColor: '#3467d6',  // TODO: Make background color configurable

    intro : [
        // screen 1
        {
            img : {
                width : '250',
                height : '250',
                url : 'img/intro/intro_import.png'
            },
            textColor: 'white',
            backgroundColor: '#3467d6',
            content : {
                firstParagraph : {
                    visible : true,
                    content : 'Import Data',
                    classes : 'intro-header'
                },
                logoDiv : {
                    visible : true,
                    id : 'logo'
                },
                finalParagraph : {
                    visible : true,
                    content : 'Import data from all your apps and devices',
                    classes : 'intro-paragraph',
                    buttonBarVisible : true
                }
            }
        },
        {
            img : {
                width : '250',
                height : '250',
                url : 'img/intro/intro_track_anything.png'
            },
            textColor: 'white',
            backgroundColor: '#f09402',
            content : {
                firstParagraph : {
                    visible : true,
                    content : 'Track Anything',
                    classes : 'intro-header'
                },
                logoDiv : {
                    visible : true,
                    id : 'logo'
                },
                finalParagraph : {
                    visible : true,
                    content : 'Log treatments, diet, symptoms, emotions, and anything else',
                    classes : 'intro-paragraph',
                    buttonBarVisible : true
                }
            }
        },
        {
            img : {
                width : '250',
                height : '250',
                url : 'img/intro/intro_make_discoveries.png'
            },
            textColor: 'white',
            backgroundColor: '#0f9d58',
            content : {

                firstParagraph : {
                    visible : true,
                    content : 'Make Discoveries',
                    classes : 'intro-header'
                },

                logoDiv : {
                    visible : true,
                    id : 'logo'
                },
                finalParagraph: {
                    visible : true,
                    content : 'Identify hidden factors most strongly linked to your well-being',
                    classes : 'intro-paragraph',
                    buttonBarVisible : true
                }
            }
        }
    ],

    helpPopupMessages : {
        "#/app/example" :'Positive Predictors are the factors most predictive of <span class="positive">IMPROVING</span> Mood for the average user.',
    },

    remindersInbox : {

    },

    wordAliases : {
        
    },

    floatingMaterialButton : {
        button1 : {
            icon: 'ion-android-notifications-none',
            label: 'Add a Reminder',
            stateAndParameters: "'app.reminderSearch'"
        },
        button2 : {
            icon: 'ion-compose',
            label: 'Record a Measurement',
            stateAndParameters: "'app.measurementAddSearch'"
        },
        button3 : {
            icon: 'ion-ios-cloud-download-outline',
            label: 'Import Data',
            stateAndParameters: "'app.import'"
        },
        button4 : {
            icon: 'ion-ios-star',
            label: 'Add a Favorite Variable',
            stateAndParameters: "'app.favoriteSearch'"
        }
    },

    menuGroupedByVariableCategories : [
        {
            title : 'Medications',
            click : 'toggleTreatmentsSubMenu',
            icon : 'ion-ios-pulse',
            showSubMenuVariable : 'showTreatmentsSubMenu',
            isSubMenuParent : true,
            collapsedIcon : 'ion-ios-medkit-outline',
            expandedIcon : 'ion-chevron-down'
        },
        {
            title : 'Overdue',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTreatmentsSubMenu',
            href : '#/app/reminders-inbox/Treatments',
            icon : 'ion-clock'
        },
        {
            title : "Today's Schedule",
            isSubMenuChild : true,
            showSubMenuVariable : 'showTreatmentsSubMenu',
            href : '#/app/reminders-inbox-today/Treatments',
            icon : 'ion-android-sunny'
        },
        {
            title : 'Manage Scheduled',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTreatmentsSubMenu',
            href : '#/app/manage-scheduled-meds',
            icon : 'ion-android-notifications-none'
        },
        {
            title : 'As-Needed Meds',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTreatmentsSubMenu',
            href : '#/app/as-needed-meds',
            icon : 'ion-ios-medkit-outline'
        },
        {
            title : 'Record a Dose',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTreatmentsSubMenu',
            href : '#/app/measurement-add-search-category/Treatments',
            icon : 'ion-edit'
        },
        {
            title : 'History',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTreatmentsSubMenu',
            href : '#/app/history-all/Treatments',
            icon : 'ion-ios-paper-outline'
        },
        {
            title : 'Symptoms',
            click : 'toggleSymptomsSubMenu',
            icon : 'ion-ios-pulse',
            isSubMenuParent : true,
            showSubMenuVariable : 'showSymptomsSubMenu',
            collapsedIcon : 'ion-sad-outline',
            expandedIcon : 'ion-chevron-down'
        },
        {
            title : 'Manage Reminders',
            isSubMenuChild : true,
            showSubMenuVariable : 'showSymptomsSubMenu',
            href : '#/app/reminders-manage/Symptoms',
            icon : 'ion-android-notifications-none'
        },
        {
            title : 'Rate Symptom',
            isSubMenuChild : true,
            showSubMenuVariable : 'showSymptomsSubMenu',
            href : '#/app/measurement-add-search-category/Symptoms',
            icon : 'ion-edit'
        },
        {
            title : 'History',
            isSubMenuChild : true,
            showSubMenuVariable : 'showSymptomsSubMenu',
            href : '#/app/history-all/Symptoms',
            icon : 'ion-ios-paper-outline'
        },
        {
            title : 'Vital Signs',
            click : 'toggleVitalSignsSubMenu',
            showSubMenuVariable : 'showVitalSignsSubMenu',
            isSubMenuParent : true,
            collapsedIcon : 'ion-ios-pulse',
            expandedIcon : 'ion-chevron-down'
        },
        {
            title : 'Manage Reminders',
            isSubMenuChild : true,
            showSubMenuVariable : 'showVitalSignsSubMenu',
            href : '#/app/reminders-manage/Vital Signs',
            icon : 'ion-android-notifications-none'
        },
        {
            title : 'Record Now',
            isSubMenuChild : true,
            showSubMenuVariable : 'showVitalSignsSubMenu',
            href : '#/app/measurement-add-search-category/Vital Signs',
            icon : 'ion-edit'
        },
        {
            title : 'History',
            isSubMenuChild : true,
            showSubMenuVariable : 'showVitalSignsSubMenu',
            href : '#/app/history-all/Vital Signs',
            icon : 'ion-ios-paper-outline'
        },
        {
            title : 'Physical Activity',
            click : 'togglePhysicalActivitySubMenu',
            showSubMenuVariable : 'showPhysicalActivitySubMenu',
            isSubMenuParent : true,
            collapsedIcon : 'ion-ios-body-outline',
            expandedIcon : 'ion-chevron-down'
        },
        {
            title : 'Manage Reminders',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPhysicalActivitySubMenu',
            href : '#/app/reminders-manage/Physical Activity',
            icon : 'ion-android-notifications-none'
        },
        {
            title : 'Record Activity',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPhysicalActivitySubMenu',
            href : '#/app/measurement-add-search-category/Physical Activity',
            icon : 'ion-edit'
        },
        {
            title : 'History',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPhysicalActivitySubMenu',
            href : '#/app/history-all/Physical Activity',
            icon : 'ion-ios-paper-outline'
        },
        {
            title : 'Emotions',
            click : 'toggleEmotionsSubMenu',
            showSubMenuVariable : 'showEmotionsSubMenu',
            isSubMenuParent : true,
            collapsedIcon : 'ion-happy-outline',
            expandedIcon : 'ion-chevron-down'
        },
        {
            title : 'Manage Reminders',
            isSubMenuChild : true,
            showSubMenuVariable : 'showEmotionsSubMenu',
            href : '#/app/reminders-manage/Emotions',
            icon : 'ion-android-notifications-none'
        },
        {
            title : 'Record Rating',
            isSubMenuChild : true,
            showSubMenuVariable : 'showEmotionsSubMenu',
            href : '#/app/measurement-add-search-category/Emotions',
            icon : 'ion-edit'
        },
        {
            title : 'History',
            isSubMenuChild : true,
            showSubMenuVariable : 'showEmotionsSubMenu',
            href : '#/app/history-all/Emotions',
            icon : 'ion-ios-paper-outline'
        },
        {
            title : 'Diet',
            click : 'toggleDietSubMenu',
            showSubMenuVariable : 'showDietSubMenu',
            isSubMenuParent : true,
            collapsedIcon : 'ion-ios-nutrition-outline',
            expandedIcon : 'ion-chevron-down'
        },
        {
            title : 'Manage Reminders',
            isSubMenuChild : true,
            showSubMenuVariable : 'showDietSubMenu',
            href : '#/app/reminders-manage/Foods',
            icon : 'ion-android-notifications-none'
        },
        {
            title : 'Record Meal',
            isSubMenuChild : true,
            showSubMenuVariable : 'showDietSubMenu',
            href : '#/app/measurement-add-search-category/Foods',
            icon : 'ion-edit'
        },
        {
            title : 'History',
            isSubMenuChild : true,
            showSubMenuVariable : 'showDietSubMenu',
            href : '#/app/history-all/Foods',
            icon : 'ion-ios-paper-outline'
        },
        {
            title : 'Favorites',
            href : '#/app/favorites',
            icon : 'ion-ios-star'
        },
    ],

    menu : [
        {
            title : 'Reminder Inbox',
            href : '#/app/reminders-inbox',
            icon : 'ion-archive'
        },
        {
            title : 'Favorites',
            href : '#/app/favorites',
            icon : 'ion-ios-star'
        },
        {
            title : 'Overall Mood',
            click : 'togglePrimaryOutcomeSubMenu',
            showSubMenuVariable : 'showPrimaryOutcomeSubMenu',
            isSubMenuParent : true,
            collapsedIcon : 'ion-happy-outline',
            expandedIcon : 'ion-chevron-down'
        },
        {
            title : 'Charts',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPrimaryOutcomeSubMenu',
            href : '#/app/track',
            icon : 'ion-arrow-graph-up-right'
        },
        {
            title : 'History',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPrimaryOutcomeSubMenu',
            href : '#/app/history',
            icon : 'ion-ios-list-outline'
        },
        {
            title : 'Positive Predictors',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPrimaryOutcomeSubMenu',
            href : '#/app/predictors/positive',
            icon : 'ion-happy-outline'
        },
        {
            title : 'Negative Predictors',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPrimaryOutcomeSubMenu',
            href : '#/app/predictors/negative',
            icon : 'ion-sad-outline'
        },
        {
            title : 'Manage Reminders',
            click : 'toggleReminderSubMenu',
            showSubMenuVariable : 'showReminderSubMenu',
            isSubMenuParent : true,
            collapsedIcon : 'ion-android-notifications-none',
            expandedIcon : 'ion-chevron-down'
        },
        {
            title : 'All Reminders',
            isSubMenuChild : true,
            showSubMenuVariable : 'showReminderSubMenu',
            href : '#/app/reminders-manage/Anything',
            icon : 'ion-android-globe'
        },
        {
            title : 'Emotions',
            isSubMenuChild : true,
            showSubMenuVariable : 'showReminderSubMenu',
            href : '#/app/reminders-manage/Emotions',
            icon : 'ion-happy-outline'
        },
        {
            title : 'Foods',
            isSubMenuChild : true,
            showSubMenuVariable : 'showReminderSubMenu',
            href : '#/app/reminders-manage/Foods',
            icon : 'ion-ios-nutrition-outline'
        },
        {
            title : 'Physical Activity',
            isSubMenuChild : true,
            showSubMenuVariable : 'showReminderSubMenu',
            href : '#/app/reminders-manage/Physical Activity',
            icon : 'ion-ios-body-outline'
        },
        {
            title : 'Symptoms',
            isSubMenuChild : true,
            showSubMenuVariable : 'showReminderSubMenu',
            href : '#/app/reminders-manage/Symptoms',
            icon : 'ion-sad-outline'
        },
        {
            title : 'Treatments',
            isSubMenuChild : true,
            showSubMenuVariable : 'showReminderSubMenu',
            href : '#/app/reminders-manage/Treatments',
            icon : 'ion-ios-medkit-outline'
        },
        {
            title : 'Vital Signs',
            isSubMenuChild : true,
            showSubMenuVariable : 'showReminderSubMenu',
            href : '#/app/reminders-manage/Vital Signs',
            icon : 'ion-ios-pulse'
        },
        {
            title : 'Record Measurement',
            click : 'toggleTrackingSubMenu',
            showSubMenuVariable : 'showTrackingSubMenu',
            isSubMenuParent : true,
            collapsedIcon : 'ion-compose',
            expandedIcon : 'ion-chevron-down'
        },
        {
            title : 'Track Anything',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTrackingSubMenu',
            href : '#/app/measurement-add-search',
            icon : 'ion-android-globe'
        },
        {
            title : 'Record a Meal',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTrackingSubMenu',
            href : '#/app/measurement-add-search-category/Foods',
            icon : 'ion-ios-nutrition-outline'
        },
        {
            title : 'Rate an Emotion',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTrackingSubMenu',
            href : '#/app/measurement-add-search-category/Emotions',
            icon : 'ion-happy-outline'
        },
        {
            title : 'Rate a Symptom',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTrackingSubMenu',
            href : '#/app/measurement-add-search-category/Symptoms',
            icon : 'ion-ios-pulse'
        },
        {
            title : 'Record a Treatment',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTrackingSubMenu',
            href : '#/app/measurement-add-search-category/Treatments',
            icon : 'ion-ios-medkit-outline'
        },
        {
            title : 'Record Activity',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTrackingSubMenu',
            href : '#/app/measurement-add-search-category/Physical Activity',
            icon : 'ion-ios-body-outline'
        },
        {
            title : 'Record Vital Sign',
            isSubMenuChild : true,
            showSubMenuVariable : 'showTrackingSubMenu',
            href : '#/app/measurement-add-search-category/Vital Signs',
            icon : 'ion-ios-pulse'
        },
        {
            title : 'History',
            click : 'toggleHistorySubMenu',
            showSubMenuVariable : 'showHistorySubMenu',
            isSubMenuParent : true,
            collapsedIcon : 'ion-ios-list-outline',
            expandedIcon : 'ion-chevron-down'
        },
        {
            title : 'All Measurements',
            isSubMenuChild : true,
            showSubMenuVariable : 'showHistorySubMenu',
            href : '#/app/history-all/Anything',
            icon : 'ion-android-globe'
        },
        {
            title : 'Emotions',
            isSubMenuChild : true,
            showSubMenuVariable : 'showHistorySubMenu',
            href : '#/app/history-all/Emotions',
            icon : 'ion-happy-outline'
        },
        {
            title : 'Foods',
            isSubMenuChild : true,
            showSubMenuVariable : 'showHistorySubMenu',
            href : '#/app/history-all/Foods',
            icon : 'ion-ios-nutrition-outline'
        },
        {
            title : 'Symptoms',
            isSubMenuChild : true,
            showSubMenuVariable : 'showHistorySubMenu',
            href : '#/app/history-all/Symptoms',
            icon : 'ion-sad-outline'
        },
        {
            title : 'Treatments',
            isSubMenuChild : true,
            showSubMenuVariable : 'showHistorySubMenu',
            href : '#/app/history-all/Treatments',
            icon : 'ion-ios-medkit-outline'
        },
        {
            title : 'Physical Activity',
            isSubMenuChild : true,
            showSubMenuVariable : 'showHistorySubMenu',
            href : '#/app/history-all/Physical Activity',
            icon : 'ion-ios-body-outline'
        },
        {
            title : 'Vital Signs',
            isSubMenuChild : true,
            showSubMenuVariable : 'showHistorySubMenu',
            href : '#/app/history-all/Vital Signs',
            icon : 'ion-ios-pulse'
        },
        {
            title : 'Locations',
            isSubMenuChild : true,
            showSubMenuVariable : 'showHistorySubMenu',
            href : '#/app/history-all/Location',
            icon : 'ion-ios-location-outline'
        },
        {
            title : 'Import Data',
            href : '#/app/import',
            icon : 'ion-ios-cloud-download-outline'
        },
        {
            title : 'Charts',
            href : '#/app/chart-search',
            icon : 'ion-arrow-graph-up-right'
        },
        {
            title : 'Relationships',
            click : 'togglePredictorSearchSubMenu',
            showSubMenuVariable : 'showPredictorSearchSubMenu',
            isSubMenuParent : true,
            collapsedIcon : 'ion-ios-analytics',
            expandedIcon : 'ion-chevron-down'
        },
        {
            title : 'Predictor Search',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPredictorSearchSubMenu',
            href : '#/app/predictor-search',
            icon : 'ion-log-in'
        },
        {
            title : 'Outcome Search',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPredictorSearchSubMenu',
            href : '#/app/outcome-search',
            icon : 'ion-log-out'
        },
/*        {
            title : 'For Everyone',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPredictorSearchSubMenu',
            href : '#/app/search-common-relationships',
            icon : 'ion-ios-people'
        },
        {
            title : 'For You',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPredictorSearchSubMenu',
            href : '#/app/search-user-relationships',
            icon : 'ion-person'
        },*/
        {
            title : 'Positive Mood',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPredictorSearchSubMenu',
            href : '#/app/predictors/positive',
            icon : 'ion-happy-outline'
        },
        {
            title : 'Negative Mood',
            isSubMenuChild : true,
            showSubMenuVariable : 'showPredictorSearchSubMenu',
            href : '#/app/predictors/negative',
            icon : 'ion-sad-outline'
        },
        {
            title : 'Settings',
            href : '#/app/settings',
            icon : 'ion-ios-gear-outline'
        },
        {
            title : 'Help & Feedback',
            href : "#/app/feedback",
            icon : 'ion-ios-help-outline'
        }
    ]
};

window.notification_callback = function(reportedVariable, reportingTime){
    var startTime  = Math.floor(reportingTime/1000) || Math.floor(new Date().getTime()/1000);
    var keyIdentifier = config.appSettings.appStorageIdentifier;
    var val = false;

    // convert values
    if(reportedVariable === "repeat_rating"){
        val = localStorage[keyIdentifier+'lastReportedPrimaryOutcomeVariableValue']?
        JSON.parse(localStorage[keyIdentifier+'lastReportedPrimaryOutcomeVariableValue']) : false;
    } else {
        val = config.appSettings.ratingTextToValueConversionDataSet[reportedVariable]?
        config.appSettings.ratingTextToValueConversionDataSet[reportedVariable] : false;
    }

    // report
    if(val){
        // update localstorage
        localStorage[keyIdentifier+'lastReportedPrimaryOutcomeVariableValue'] = val;

        var allMeasurementsObject = {
            storedValue : val,
            value : val,
            startTime : startTime,
            humanTime : {
                date : new Date().toISOString()
            }
        };

        // update full data
        if(localStorage[keyIdentifier+'allMeasurements']){
            var allMeasurements = JSON.parse(localStorage[keyIdentifier+'allMeasurements']);
            allMeasurements.push(allMeasurementsObject);
            localStorage[keyIdentifier+'allMeasurements'] = JSON.stringify(allMeasurements);
        }

        //update measurementsQueue
        if(!localStorage[keyIdentifier+'measurementsQueue']){
            localStorage[keyIdentifier+'measurementsQueue'] = '[]';
        } else {
            var measurementsQueue = JSON.parse(localStorage[keyIdentifier+'measurementsQueue']);
            measurementsQueue.push(allMeasurementsObject);
            localStorage[keyIdentifier+'measurementsQueue'] = JSON.stringify(measurementsQueue);
        }
    }
};