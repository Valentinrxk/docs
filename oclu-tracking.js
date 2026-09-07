(function () {
    "use strict";

    var ENDPOINT = "https://oclucrm.com/api/guide/track";
    var STORAGE_KEY = "oclu_guide_visit";
    var PARAM = "oclu_v";
    var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    var lastPath = null;

    var readStored = function () {
        try {
            var stored = window.sessionStorage.getItem(STORAGE_KEY);
            return stored && UUID_RE.test(stored) ? stored : null;
        } catch (e) {
            return null;
        }
    };

    var persist = function (visitId) {
        try {
            window.sessionStorage.setItem(STORAGE_KEY, visitId);
        } catch (e) {}
    };

    var stripParam = function () {
        try {
            var url = new URL(window.location.href);

            if (!url.searchParams.has(PARAM)) return;

            url.searchParams.delete(PARAM);
            window.history.replaceState(
                window.history.state,
                "",
                url.pathname + url.search + url.hash
            );
        } catch (e) {}
    };

    var resolveVisitId = function () {
        var fromUrl = null;

        try {
            fromUrl = new URLSearchParams(window.location.search).get(PARAM);
        } catch (e) {}

        if (fromUrl && UUID_RE.test(fromUrl)) {
            persist(fromUrl);
            stripParam();
            return fromUrl;
        }

        return readStored();
    };

    var send = function () {
        var path = window.location.pathname || "/";

        if (path === lastPath) return;
        lastPath = path;

        var payload = {
            visit_id: resolveVisitId(),
            path: path,
            title: (document.title || "").slice(0, 255),
            referrer: (document.referrer || "").slice(0, 512)
        };

        try {
            window.fetch(ENDPOINT, {
                method: "POST",
                keepalive: true,
                mode: "cors",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).catch(function () {});
        } catch (e) {}
    };

    var schedule = function () {
        window.setTimeout(send, 300);
    };

    var patchHistory = function (method) {
        var original = window.history[method];

        if (typeof original !== "function") return;

        window.history[method] = function () {
            var result = original.apply(this, arguments);
            schedule();
            return result;
        };
    };

    patchHistory("pushState");
    patchHistory("replaceState");
    window.addEventListener("popstate", schedule);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", send);
    } else {
        send();
    }
})();
