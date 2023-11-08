var screenClient = null;
var localScreenTrack = null;

var config = {
    mode: 'rtc',
    codec: 'vp8',
}

var client = AgoraRTC.createClient(config);
var options = {
    appId: "f5537f8d69ae46038d0ae78811c80a00",//heres appId "f5537f8d69ae46038d0ae78811c80a00"
    channel: null,
    token: null,
    uid: null,
}
var localTracks = {
    audioTrack: null,
    videoTrack: null,
};
var remoteUsers = {};
function generateRandomChannel() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const length = 8; // 8 characters
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
    return result;
}
document.addEventListener('DOMContentLoaded', function() {
    const channelInput = document.getElementById('channel');
    channelInput.value = generateRandomChannel();
});
$('#Leave').attr('disabled', true);

$('#Join').click(async function (e) {
    e.preventDefault(); // Prevent form submission

    try {
        options.appId = $('#appId').val();
        options.channel = $('#channel').val();
        
        // Validate App ID
        if (!isValidAppId(options.appId)) {
            console.error('Invalid App ID.');
            return;
        }

        // Fetch the token from your token server
        const tokenServerURL = 'https://agora-node-tokenserver-elite-meeting.darelahmedgalen.repl.co/access_token?channelName=' + options.channel;
        const response = await fetch(tokenServerURL);
        if (!response.ok) {
            console.error('Failed to fetch token from the server.');
            return;
        }

        const tokenData = await response.json();
        options.token = tokenData.token;

        // Join the channel with the obtained token
        await join();

        // Hide the form and show necessary buttons
        $('.form-container').hide();
        $('#Leave').show();
        $('#startScreenShare').show();
        $('#startRecording').show();
    } catch (error) {
        console.error(error);
    } finally {
        $('#Leave').attr('disabled', false);
        $('#Join').attr('disabled', true);
    }
});

$('#shareRoomInvitation').click(function (e) {
    alert("Coming Soon, stay tune!");
});

$('#startScreenShare').click(async function (e) {
    e.preventDefault();
    try {
        const screenClientConfig = { mode: 'rtc', codec: 'vp8' };
        screenClient = AgoraRTC.createClient(screenClientConfig);

        screenClient.on('user-published', handleUserPublished);
        screenClient.on('user-unpublished', handleUserUnPublished);

        // Bergabung dengan channel yang sama dengan panggilan video
        await screenClient.join(options.appId, options.channel, options.token || null);

        localScreenTrack = await AgoraRTC.createScreenVideoTrack({
            encoderConfig: '720p_1',
        });
        await screenClient.publish([localScreenTrack]);

        // Sembunyikan tombol "Start Screen Sharing" dan tampilkan "Stop Screen Sharing"
        $('#startScreenShare').hide();
        $('#stopScreenShare').show();
    } catch (error) {
        console.error(error);
    }
});

// Tambahkan event click untuk tombol "Stop Screen Sharing"
$('#stopScreenShare').click(async function (e) {
    e.preventDefault();
    if (localScreenTrack) {
        localScreenTrack.stop();
        localScreenTrack.close();
        screenClient.unpublish([localScreenTrack]);
        $('#startScreenShare').show();
        $('#stopScreenShare').hide();
    }
});

// Fungsi untuk memeriksa validitas App ID
function isValidAppId(appId) {
    return /^[A-Za-z0-9]{1,2047}$/.test(appId);
}

async function join() {
    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnPublished);
    [options.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
        client.join(options.appId, options.channel, options.token || null),
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack(),
    ]);

    localTracks.videoTrack.play('local-user');
    $('#local-user-stream').text(`local-user-(${options.uid})`);
    await client.publish(Object.values(localTracks));
    console.log('Publish Successfully');
    showUIButtons();
}

async function subscribe(user, mediaType) {
    const uid = user.uid;
    await client.subscribe(user, mediaType);
    console.log('Subscribe successfully');
    if (mediaType === 'video') {
        const player = $(`
        <div id="player-wrapper-${uid}">
            <p class="player-name">remote-player(${uid})</p>
            <div id="player-${uid}" class="player"></div>
            </div>
            `)

        $('#remote-user').append(player);
        user.videoTrack.play(`player-${uid}`);
    }
    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
}

$('#Leave').click(async function (e) {
    $('.form-container').show();
    leave();
});

async function leave() {
    for (trackName in localTracks) {
        var track = localTracks[trackName];
        if (track) {
            track.stop();
            track.close();
            localTracks[trackName] = undefined;
        }
    }
    
    remoteUsers = {};
    await client.leave();
    $('#remote-user').html('');
    $('#Leave').attr('disabled', true);
    $('#Join').attr('disabled', false);
    $('#local-user-stream').text('');
    console.log('Client succeed to leave.');
    hideUIButtons();
    window.location.reload();
}

function handleUserPublished(user, mediaType) {
    const id = user.uid;
    remoteUsers[id] = user;
    subscribe(user, mediaType);
}

function handleUserUnPublished(user) {
    const id = user.uid;
    delete remoteUsers[id];
    $(`#player-wrapper-${id}`).remove();
}

// Function to turn on the remote user's camera
function turnOnRemoteUserCamera(uid) {
    const remoteUser = remoteUsers[uid];
    if (remoteUser) {
        // Check if the remote user is still in the channel
        if (remoteUser.hasVideo) {
            remoteUser.videoTrack.setEnabled(true);
        } else {
            console.error('Remote user does not have video track.');
        }
    } else {
        console.error('Remote user is not in the channel.');
    }
}

// Function to turn off the remote user's camera
function turnOffRemoteUserCamera(uid) {
    const remoteUser = remoteUsers[uid];
    if (remoteUser) {
        // Check if the remote user is still in the channel
        if (remoteUser.hasVideo) {
            remoteUser.videoTrack.setEnabled(false);
        } else {
            console.error('Remote user does not have video track.');
        }
    } else {
        console.error('Remote user is not in the channel.');
    }
}