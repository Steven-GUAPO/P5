/**
 * A Google Maps JavaScript API game that tests knowledge of
 * CSUN campus building locations. The user double-clicks where they
 * think each building is; a colored rectangle reveals whether they
 * were correct green or shows the true location red.
 *
 * Extra features implemented:
 *   - Live countdown timer
 *   - localStorage high score (best correct answers + fastest time)
 *   - Rectangle pulse/flash animation on each answer
 *   - Left-panel shake animation on wrong answers
 *   - Play Again button
 *

*/
var CSUN_CENTER = { lat: 34.23954, lng: -118.52796 };
var CSUN_ZOOM   = 16.9;

/**
 * Five CSUN campus locations. Each object has:
 *   name   — the question prompt shown to the user
 *   bounds — {north, south, east, west} bounding box of the building.
 *             A double-click inside this box counts as a correct answer.
 *
 * Order: 4 chosen locations + Chicano House D5
 */
var locations = [
    {
        name: "Where is the Bookstore??",
        bounds: { north: 34.2378, south: 34.2371, east: -118.5276, west: -118.5285 }
    },
    {
        name: "Where is Chicano House",
        bounds: { north: 34.2427, south: 34.2422, east: -118.5295, west: -118.5303 }
    },
    {
        name: "Where is Jacaranda Hall",
        bounds: { north: 34.2416, south: 34.2410, east: -118.5285, west: -118.5293 }
    },
    {
        name: "Where is Manzanita Hall",
        bounds: { north: 34.2382, south: 34.2375, east: -118.5298, west: -118.5307 }
    },
    {
        name: "Where is Citrus Hall",
        bounds: { north: 34.2396, south: 34.2389, east: -118.5277, west: -118.5285 }
    }
];

/* ──────────────────────────────────────────────
   GAME STATE
   ────────────────────────────────────────────── */

var map;
var currentQuestion = 0;
var score           = 0;
var incorrectCount  = 0;
var answered        = false; /* blocks extra clicks while waiting for next question */
var timerInterval   = null;
var elapsedSeconds  = 0;

/* ──────────────────────────────────────────────
   MAP INITIALIZATION  (Google Maps callback)
   ────────────────────────────────────────────── */

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center:                CSUN_CENTER,
        zoom:                  CSUN_ZOOM,
        disableDefaultUI:      true,  /* hides all built-in controls */
        disableDoubleClickZoom: true, /* prevents zoom but still fires dblclick event */
        draggable:             false, /* no panning */
        scrollwheel:           false, /* no scroll-to-zoom */
        gestureHandling:       'none',/* no touch gestures */
        clickableIcons:        false, /* no POI info-windows */
        keyboardShortcuts:     false  /* no keyboard navigation */
    });

    /* Listen for user double-clicks on the map */
    map.addListener('dblclick', function(e) {
        handleMapClick(e.latLng);
    });

    loadHighScore();   /* show any stored best time before game begins */
    startTimer();
    showQuestion(currentQuestion);
}

/* ──────────────────────────────────────────────
   QUESTION DISPLAY
   ────────────────────────────────────────────── */

function showQuestion(index) {
    answered = false;

    /* Append the question as a blue history row using jQuery */
    var $item = $('<div></div>')
        .addClass('history-item question-item')
        .text(locations[index].name);
    $('#question-history').append($item);

    scrollToBottom();
}

/* ──────────────────────────────────────────────
   CLICK HANDLING & HIT DETECTION
   ────────────────────────────────────────────── */

function handleMapClick(latLng) {
    /* Ignore clicks while waiting for the next question to load */
    if (answered || currentQuestion >= locations.length) return;

    answered = true;

    var clickedLat = latLng.lat();
    var clickedLng = latLng.lng();
    var b = locations[currentQuestion].bounds;

    /* Check whether the click falls inside the building's bounding box */
    var isCorrect = clickedLat >= b.south && clickedLat <= b.north &&
                    clickedLng >= b.west  && clickedLng <= b.east;

    if (isCorrect) {
        score++;
        handleCorrect(b);
    } else {
        incorrectCount++;
        handleIncorrect(b);
    }

    /* Pause briefly so the user can see the colored rectangle, then advance */
    setTimeout(function() {
        currentQuestion++;
        if (currentQuestion < locations.length) {
            showQuestion(currentQuestion);
        } else {
            endGame();
        }
    }, 1500);
}

/* ──────────────────────────────────────────────
   CORRECT / INCORRECT OUTCOMES
   ────────────────────────────────────────────── */

function handleCorrect(bounds) {
    var rect = drawRectangle(bounds, '#00AA00', '#00CC00');
    pulseRectangle(rect);

    var $result = $('<div></div>')
        .addClass('history-item correct-text')
        .text('Your answer is correct!!');
    $('#question-history').append($result);
    scrollToBottom();
}

function handleIncorrect(bounds) {
    /* Draw red rectangle at the TRUE location so the user can learn */
    var rect = drawRectangle(bounds, '#CC0000', '#FF0000');
    flashRectangle(rect);

    /* Shake the left panel to signal the wrong answer */
    $('#left-panel').addClass('shake');
    setTimeout(function() { $('#left-panel').removeClass('shake'); }, 500);

    var $result = $('<div></div>')
        .addClass('history-item incorrect-text')
        .text('Sorry wrong location.');
    $('#question-history').append($result);
    scrollToBottom();
}

/* ──────────────────────────────────────────────
   MAP DRAWING
   ────────────────────────────────────────────── */

function drawRectangle(bounds, strokeColor, fillColor) {
    return new google.maps.Rectangle({
        bounds:        bounds,
        strokeColor:   strokeColor,
        strokeOpacity: 1.0,
        strokeWeight:  2,
        fillColor:     fillColor,
        fillOpacity:   0.35,
        map:           map
    });
}

/* ──────────────────────────────────────────────
   RECTANGLE ANIMATIONS
   ────────────────────────────────────────────── */

/* Slow pulse for correct answers — alternates between bright and dim */
function pulseRectangle(rect) {
    var count = 0;
    var interval = setInterval(function() {
        rect.setOptions({ fillOpacity: count % 2 === 0 ? 0.65 : 0.15 });
        count++;
        if (count >= 6) {
            clearInterval(interval);
            rect.setOptions({ fillOpacity: 0.45 });
        }
    }, 200);
}

/* Rapid flash for incorrect answers — quicker, more urgent feel */
function flashRectangle(rect) {
    var count = 0;
    var interval = setInterval(function() {
        rect.setOptions({ fillOpacity: count % 2 === 0 ? 0.75 : 0.1 });
        count++;
        if (count >= 8) {
            clearInterval(interval);
            rect.setOptions({ fillOpacity: 0.45 });
        }
    }, 120);
}

/* ──────────────────────────────────────────────
   TIMER
   ────────────────────────────────────────────── */

function startTimer() {
    elapsedSeconds = 0;
    timerInterval = setInterval(function() {
        elapsedSeconds++;
        $('#timer').text(formatTime(elapsedSeconds));
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

/* Formats total seconds as M:SS */
function formatTime(totalSeconds) {
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

/* ──────────────────────────────────────────────
   END GAME
   ────────────────────────────────────────────── */

function endGame() {
    stopTimer();

    /* Remove the double-click listener so no further input is accepted */
    google.maps.event.clearListeners(map, 'dblclick');

    /* Reveal the final score with a pop-in animation */
    var $scoreEl = $('#score-display');
    $scoreEl.html(score + ' Correct, ' + incorrectCount + ' Incorrect')
            .removeClass('hidden')
            .addClass('score-animate');

    /* Play Again button reloads the page for a fresh game */
    var $replay = $('<button></button>')
        .attr('id', 'replay-btn')
        .text('Play Again')
        .on('click', function() { location.reload(); });
    $('#left-panel').append($replay);

    updateHighScore();
}

/* ──────────────────────────────────────────────
   HIGH SCORE  (persisted in localStorage)
   ────────────────────────────────────────────── */

/* Called on game end — saves and displays new record if earned */
function updateHighScore() {
    var prevTime  = parseInt(localStorage.getItem('csun_quiz_best_time'),  10);
    var prevScore = parseInt(localStorage.getItem('csun_quiz_best_score'), 10);

    /* A new record is: more correct answers, OR same answers in less time */
    var isFirstGame = isNaN(prevScore);
    var isBetter    = score > prevScore ||
                      (score === prevScore && elapsedSeconds < prevTime);

    if (isFirstGame || isBetter) {
        localStorage.setItem('csun_quiz_best_time',  elapsedSeconds);
        localStorage.setItem('csun_quiz_best_score', score);
        $('#best-time')
            .text(formatTime(elapsedSeconds) + ' — ' + score + '/5  ★ NEW RECORD!')
            .addClass('new-record');
    } else {
        $('#best-time').text(formatTime(prevTime) + ' — ' + prevScore + '/5');
    }
}

/* Called on page load — shows stored best before the game starts */
function loadHighScore() {
    var prevTime  = localStorage.getItem('csun_quiz_best_time');
    var prevScore = localStorage.getItem('csun_quiz_best_score');
    if (prevTime !== null) {
        $('#best-time').text(
            formatTime(parseInt(prevTime, 10)) + ' — ' + prevScore + '/5'
        );
    }
}

/* ──────────────────────────────────────────────
   UTILITY
   ────────────────────────────────────────────── */

/* Scrolls the left panel to show the most recently appended row */
function scrollToBottom() {
    var panel = $('#left-panel')[0];
    panel.scrollTop = panel.scrollHeight;
}
