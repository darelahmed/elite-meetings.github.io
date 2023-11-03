var config = {
    mode: 'rtc',
    codec: 'vp8',
}

var client = AgoraRTC.createClient(config);
var options = {
    appId: null,//heres appId "f5537f8d69ae46038d0ae78811c80a00" without use token
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

// Tambahkan event click untuk tombol Join
$('#Join').click(async function (e) {
    e.preventDefault(); // Mencegah pengiriman form
    try {
        options.appId = $('#appId').val();
        options.channel = $('#channel').val();
        options.token = $('#token').val();
        
        // Validasi App ID
        if (!isValidAppId(options.appId)) {
            console.error('Invalid App ID. It should be a valid string within the specified length limits and containing only ASCII characters.');
            return;
        }
        
        await join();
        $('.form-container').hide();
        $('#Leave').show();
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
