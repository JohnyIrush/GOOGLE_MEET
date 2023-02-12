$(function () {
    $(document).on("click", ".join-meeting", function() {
        $('.enter-code').focus();
    })

    $(document).on("click", ".join-action", function() {
        var join_value = $('.enter-code').val();
        var meetingUrl = window.location.origin + "?meetingID="+join_value
        window.location = meetingUrl
    })

    $(document).on("click", ".new-meeting", function() {
        var eight_d_value = Math.floor(Math.random() * 10000000)
        var meetingUrl = window.location.origin + "?meetingID="+eight_d_value
        window.location = meetingUrl
    })
})