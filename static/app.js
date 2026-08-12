// =========================================================
// AI LEAD INTELLIGENCE PLATFORM
// Frontend Application
// =========================================================

const state = {
    leads: [],
    saved: JSON.parse(
        localStorage.getItem("savedLeads") || "[]"
    )
};


// =========================================================
// HELPERS
// =========================================================

const $ = (selector) =>
    document.querySelector(selector);

const $$ = (selector) =>
    document.querySelectorAll(selector);


function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


function getInitials(name) {
    return String(name || "")
        .split(" ")
        .map(word => word.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
}


// =========================================================
// TOAST
// =========================================================

function showToast(message) {

    const toast = $("#toast");
    const text = $("#toastMessage");

    if (!toast || !text) return;

    text.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}


// =========================================================
// API
// =========================================================

async function api(url, options = {}) {

    const response = await fetch(url, options);

    if (!response.ok) {

        let message = "Request failed";

        try {
            const data = await response.json();

            message =
                data.detail ||
                data.message ||
                message;

        } catch (error) {
            // Ignore JSON parsing errors
        }

        throw new Error(message);
    }

    return response.json();
}


// =========================================================
// LOADING
// =========================================================

function loadingHTML() {

    return `
        <div class="loading">
            <div class="spinner"></div>
            Loading intelligence...
        </div>
    `;
}


// =========================================================
// NAVIGATION
// =========================================================

function showSection(sectionId) {

    $$(".page-section").forEach(section => {
        section.classList.remove("active-section");
    });

    const section = $(`#${sectionId}`);

    if (section) {
        section.classList.add("active-section");
    }

    $$(".nav-item").forEach(button => {

        button.classList.remove("active");

        if (button.dataset.section === sectionId) {
            button.classList.add("active");
        }
    });

    const titles = {
        dashboard: "Lead Intelligence",
        search: "Lead Search",
        saved: "Saved Leads",
        analytics: "Analytics",
        github: "GitHub Analyzer"
    };

    const pageTitle = $("#pageTitle");

    if (pageTitle) {
        pageTitle.textContent =
            titles[sectionId] ||
            "Lead Intelligence";
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    if (sectionId === "saved") {
        renderSavedLeads();
    }

    if (sectionId === "analytics") {
        updateAnalytics();
    }
}


$$(".nav-item").forEach(button => {

    button.addEventListener("click", () => {

        showSection(
            button.dataset.section
        );

    });

});


$$("[data-section-target]").forEach(button => {

    button.addEventListener("click", () => {

        showSection(
            button.dataset.sectionTarget
        );

    });

});


// =========================================================
// LEAD CARD
// =========================================================

function leadCard(lead) {

    const isSaved =
        state.saved.some(
            saved => saved.id === lead.id
        );

    const score =
        lead.score ?? 0;

    return `
        <article
            class="lead-card"
            data-lead-id="${escapeHTML(lead.id)}"
        >

            <div class="lead-top">

                <div class="lead-person">

                    <div class="avatar">
                        ${escapeHTML(
                            lead.avatar ||
                            getInitials(lead.name)
                        )}
                    </div>

                    <div>

                        <div class="lead-name">
                            ${escapeHTML(
                                lead.name
                            )}
                        </div>

                        <div class="lead-title">
                            ${escapeHTML(
                                lead.title
                            )}
                        </div>

                    </div>

                </div>

                <div class="score">
                    ${score}
                </div>

            </div>


            <div class="company-line">

                ${escapeHTML(
                    lead.company
                )}

                <span>
                    ·
                    ${escapeHTML(
                        lead.industry
                    )}
                </span>

            </div>


            <div class="location">
                ◉
                ${escapeHTML(
                    lead.location
                )}
            </div>


            <div class="skills">

                ${
                    (lead.skills || [])
                        .map(
                            skill => `
                                <span class="skill">
                                    ${escapeHTML(skill)}
                                </span>
                            `
                        )
                        .join("")
                }

            </div>


            <div class="card-actions">

                <button
                    class="card-action"
                    onclick="openLead('${escapeHTML(lead.id)}')"
                >
                    Analyze
                </button>

                <button
                    class="card-action"
                    onclick="toggleSave('${escapeHTML(lead.id)}')"
                >
                    ${
                        isSaved
                            ? "♥ Saved"
                            : "♡ Save"
                    }
                </button>

            </div>

        </article>
    `;
}


// =========================================================
// DASHBOARD
// =========================================================

async function loadDashboard() {

    const container =
        $("#dashboardLeads");

    if (!container) return;

    container.innerHTML =
        loadingHTML();

    try {

        const data = await api(
            "/api/search",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({})
            }
        );

        state.leads =
            data.results || [];

        const totalLeads =
            $("#totalLeads");

        if (totalLeads) {
            totalLeads.textContent =
                data.count ?? state.leads.length;
        }


        const high =
            state.leads.filter(
                lead =>
                    Number(lead.score || 0) >= 80
            ).length;

        const highMatch =
            $("#highMatch");

        if (highMatch) {
            highMatch.textContent = high;
        }


        const industries =
            new Set(
                state.leads.map(
                    lead =>
                        lead.industry
                )
            );

        const industryCount =
            $("#industryCount");

        if (industryCount) {
            industryCount.textContent =
                industries.size;
        }


        container.innerHTML =
            state.leads
                .slice(0, 6)
                .map(leadCard)
                .join("");


        updateAnalytics();

    } catch (error) {

        container.innerHTML = `
            <div class="empty-state">

                <strong>
                    Unable to load leads
                </strong>

                <span>
                    ${escapeHTML(
                        error.message
                    )}
                </span>

            </div>
        `;
    }
}


// =========================================================
// SEARCH
// =========================================================

function getSearchRequest() {

    return {

        title:
            $("#searchTitle")?.value.trim() || "",

        company:
            $("#searchCompany")?.value.trim() || "",

        location:
            $("#searchLocation")?.value.trim() || "",

        industry:
            $("#searchIndustry")?.value || "",

        experience:
            $("#searchExperience")?.value || "",

        keywords:
            $("#searchKeywords")?.value.trim() || ""
    };
}


async function performSearch(
    request = getSearchRequest()
) {

    const results =
        $("#searchResults");

    if (!results) return;

    results.innerHTML =
        loadingHTML();

    try {

        const data = await api(
            "/api/search",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify(request)
            }
        );

        state.leads =
            data.results || [];

        const resultCount =
            $("#resultCount");

        if (resultCount) {
            resultCount.textContent =
                data.count ?? state.leads.length;
        }

        renderSearchResults();

        showToast(
            `${data.count ?? state.leads.length} prospects found`
        );

    } catch (error) {

        results.innerHTML = `
            <div class="empty-state">

                <strong>
                    Search failed
                </strong>

                <span>
                    ${escapeHTML(
                        error.message
                    )}
                </span>

            </div>
        `;
    }
}


function renderSearchResults() {

    const container =
        $("#searchResults");

    if (!container) return;

    if (!state.leads.length) {

        container.innerHTML = `
            <div class="empty-state">

                <strong>
                    No prospects found
                </strong>

                <span>
                    Try broadening your filters.
                </span>

            </div>
        `;

        return;
    }


    let leads = [
        ...state.leads
    ];


    const sort =
        $("#sortResults")?.value ||
        "score";


    if (sort === "name") {

        leads.sort(
            (a, b) =>
                String(a.name || "")
                    .localeCompare(
                        String(b.name || "")
                    )
        );

    } else if (sort === "company") {

        leads.sort(
            (a, b) =>
                String(a.company || "")
                    .localeCompare(
                        String(b.company || "")
                    )
        );

    } else {

        leads.sort(
            (a, b) =>
                Number(b.score || 0) -
                Number(a.score || 0)
        );
    }


    container.innerHTML =
        leads
            .map(leadCard)
            .join("");
}


const searchButton =
    $("#searchButton");

if (searchButton) {

    searchButton.addEventListener(
        "click",
        () => performSearch()
    );
}


const sortResults =
    $("#sortResults");

if (sortResults) {

    sortResults.addEventListener(
        "change",
        renderSearchResults
    );
}


// =========================================================
// QUICK SEARCH
// =========================================================

const quickSearchButton =
    $("#quickSearchButton");

if (quickSearchButton) {

    quickSearchButton.addEventListener(
        "click",
        async () => {

            const request = {

                title:
                    $("#quickTitle")
                        ?.value
                        .trim() || "",

                company:
                    $("#quickCompany")
                        ?.value
                        .trim() || "",

                location:
                    $("#quickLocation")
                        ?.value
                        .trim() || "",

                industry: "",

                experience: "",

                keywords: ""
            };


            if ($("#searchTitle")) {
                $("#searchTitle").value =
                    request.title;
            }

            if ($("#searchCompany")) {
                $("#searchCompany").value =
                    request.company;
            }

            if ($("#searchLocation")) {
                $("#searchLocation").value =
                    request.location;
            }


            showSection("search");

            await performSearch(
                request
            );
        }
    );
}


// =========================================================
// SAVED LEADS
// =========================================================

function toggleSave(id) {

    const lead =
        state.leads.find(
            item =>
                String(item.id) === String(id)
        ) ||
        state.saved.find(
            item =>
                String(item.id) === String(id)
        );


    const savedIndex =
        state.saved.findIndex(
            item =>
                String(item.id) === String(id)
        );


    if (savedIndex >= 0) {

        state.saved.splice(
            savedIndex,
            1
        );

        showToast(
            "Lead removed from saved"
        );

    } else {

        if (!lead) {

            showToast(
                "Lead is not available"
            );

            return;
        }

        state.saved.push(
            lead
        );

        showToast(
            "Lead saved"
        );
    }


    localStorage.setItem(
        "savedLeads",
        JSON.stringify(
            state.saved
        )
    );


    renderSearchResults();
    renderSavedLeads();

    if (
        $("#dashboardLeads")
    ) {
        $("#dashboardLeads").innerHTML =
            state.leads
                .slice(0, 6)
                .map(leadCard)
                .join("");
    }
}


function renderSavedLeads() {

    const container =
        $("#savedResults");

    if (!container) return;


    if (!state.saved.length) {

        container.innerHTML = `
            <div class="empty-state">

                <strong>
                    No saved leads yet
                </strong>

                <span>
                    Save promising prospects
                    from Lead Search.
                </span>

            </div>
        `;

        return;
    }


    container.innerHTML =
        state.saved
            .map(leadCard)
            .join("");
}


// =========================================================
// LEAD AI ANALYSIS
// =========================================================

async function openLead(id) {

    let lead =
        state.leads.find(
            item =>
                String(item.id) === String(id)
        );


    if (!lead) {

        lead =
            state.saved.find(
                item =>
                    String(item.id) === String(id)
            );
    }


    if (!lead) {

        showToast(
            "Lead not found"
        );

        return;
    }


    const modal =
        $("#leadModal");

    const body =
        $("#modalBody");


    if (!modal || !body) return;


    modal.classList.add("open");

    body.innerHTML =
        loadingHTML();


    try {

        const data =
            await api(
                "/api/ai",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            lead_id:
                                lead.id,

                            action:
                                "analyze",

                            tone:
                                "professional"
                        })
                }
            );


        renderLeadAnalysis(
            lead,
            data
        );


    } catch (error) {

        body.innerHTML = `
            <div class="empty-state">

                <strong>
                    AI analysis failed
                </strong>

                <span>
                    ${escapeHTML(
                        error.message
                    )}
                </span>

            </div>
        `;
    }
}


// =========================================================
// AI ANALYSIS DISPLAY
// =========================================================

function renderLeadAnalysis(
    lead,
    data
) {

    const body =
        $("#modalBody");

    if (!body) return;


    const strengths =
        data.strengths ||
        lead.skills ||
        [];


    const reasons =
        data.reasons ||
        lead.reasons ||
        [];


    body.innerHTML = `

        <div>

            <span class="eyebrow">
                AI PROFILE ANALYSIS
            </span>

            <h2 class="modal-title">
                ${escapeHTML(
                    lead.name
                )}
            </h2>

            <p class="modal-subtitle">
                ${escapeHTML(
                    lead.title
                )}
                ·
                ${escapeHTML(
                    lead.company
                )}
            </p>

        </div>


        <div class="ai-section">

            <h4>
                Match Assessment
            </h4>

            <p>
                ${escapeHTML(
                    data.summary ||
                    "Profile analysis completed."
                )}
            </p>

        </div>


        <div class="ai-section">

            <h4>
                Strengths
            </h4>

            <div class="ai-list">

                ${
                    strengths
                        .map(
                            item => `
                                <span class="ai-tag">
                                    ${escapeHTML(item)}
                                </span>
                            `
                        )
                        .join("")
                }

            </div>

        </div>


        <div class="ai-section">

            <h4>
                Match Signals
            </h4>

            <div class="ai-list">

                ${
                    reasons
                        .map(
                            item => `
                                <span class="ai-tag">
                                    ${escapeHTML(item)}
                                </span>
                            `
                        )
                        .join("")
                }

            </div>

        </div>


        <div class="ai-section">

            <h4>
                Recommended Next Step
            </h4>

            <p>
                ${escapeHTML(
                    data.next_step ||
                    "Personalize your outreach."
                )}
            </p>

        </div>


        <div class="ai-section">

            <button
                class="primary-button"
                id="generateMessage"
            >
                ✦ Generate AI Outreach
            </button>

        </div>

    `;


    const button =
        $("#generateMessage");

    if (button) {

        button.addEventListener(
            "click",
            () => generateMessage(lead)
        );
    }
}


// =========================================================
// AI OUTREACH
// =========================================================

async function generateMessage(
    lead
) {

    const button =
        $("#generateMessage");

    if (!button) return;


    button.disabled = true;

    button.textContent =
        "Generating...";


    try {

        const data =
            await api(
                "/api/ai",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({

                            lead_id:
                                lead.id,

                            action:
                                "message",

                            tone:
                                "professional"
                        })
                }
            );


        const oldMessage =
            $("#modalBody")
                ?.querySelector(
                    ".ai-message"
                );


        if (oldMessage) {
            oldMessage.remove();
        }


        const box =
            document.createElement(
                "div"
            );


        box.className =
            "ai-section ai-message";


        const message =
            data.message ||
            data.summary ||
            "";


        box.innerHTML = `

            <h4>
                Personalized Outreach
            </h4>

            <p>
                ${escapeHTML(message)}
            </p>

            <button
                class="secondary-button"
                id="copyMessage"
                style="margin-top:12px"
            >
                Copy Message
            </button>

        `;


        $("#modalBody")
            ?.appendChild(box);


        const copyButton =
            $("#copyMessage");


        if (copyButton) {

            copyButton.addEventListener(
                "click",
                async () => {

                    try {

                        await navigator
                            .clipboard
                            .writeText(
                                message
                            );

                        showToast(
                            "Message copied"
                        );

                    } catch {

                        showToast(
                            "Unable to copy message"
                        );
                    }
                }
            );
        }


    } catch (error) {

        showToast(
            error.message
        );


    } finally {

        button.disabled = false;

        button.textContent =
            "✦ Generate AI Outreach";
    }
}


// =========================================================
// CLOSE MODAL
// =========================================================

const closeModal =
    $("#closeModal");

if (closeModal) {

    closeModal.addEventListener(
        "click",
        () => {

            $("#leadModal")
                ?.classList
                .remove("open");

        }
    );
}


const modalBackdrop =
    $(".modal-backdrop");

if (modalBackdrop) {

    modalBackdrop.addEventListener(
        "click",
        () => {

            $("#leadModal")
                ?.classList
                .remove("open");

        }
    );
}


document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            $("#leadModal")
                ?.classList
                .remove("open");
        }
    }
);


// =========================================================
// ANALYTICS
// =========================================================

function updateAnalytics() {

    const leads =
        state.leads;


    if (!leads.length) {
        return;
    }


    const average =
        Math.round(
            leads.reduce(
                (sum, lead) =>
                    sum +
                    Number(lead.score || 0),
                0
            ) / leads.length
        );


    const averageScore =
        $("#averageScore");

    if (averageScore) {
        averageScore.textContent =
            average;
    }


    const averageProgress =
        $("#averageProgress");

    if (averageProgress) {
        averageProgress.style.width =
            `${average}%`;
    }


    const senior =
        leads.filter(
            lead =>
                lead.experience === "Senior" ||
                lead.experience === "Lead"
        ).length;


    const seniorCount =
        $("#seniorCount");

    if (seniorCount) {
        seniorCount.textContent =
            senior;
    }


    const seniorProgress =
        $("#seniorProgress");

    if (seniorProgress) {

        seniorProgress.style.width =
            `${Math.round(
                senior /
                leads.length *
                100
            )}%`;
    }


    const tech =
        leads.filter(
            lead =>
                lead.industry ===
                "Technology"
        ).length;


    const techCount =
        $("#techCount");

    if (techCount) {
        techCount.textContent =
            tech;
    }


    const techProgress =
        $("#techProgress");

    if (techProgress) {

        techProgress.style.width =
            `${Math.round(
                tech /
                leads.length *
                100
            )}%`;
    }


    const industryCounts = {};


    leads.forEach(lead => {

        const industry =
            lead.industry ||
            "Other";

        industryCounts[industry] =
            (
                industryCounts[industry] ||
                0
            ) + 1;

    });


    const sorted =
        Object.entries(
            industryCounts
        )
        .sort(
            (a, b) =>
                b[1] - a[1]
        );


    const max =
        sorted.length
            ? sorted[0][1]
            : 1;


    const chart =
        $("#industryChart");


    if (!chart) return;


    chart.innerHTML =
        sorted
            .map(
                ([industry, count]) => `

                    <div class="chart-row">

                        <span class="chart-label">
                            ${escapeHTML(
                                industry
                            )}
                        </span>

                        <div class="chart-bar">

                            <div
                                class="chart-fill"
                                style="
                                    width:
                                    ${
                                        count /
                                        max *
                                        100
                                    }%;
                                "
                            ></div>

                        </div>

                        <span>
                            ${count}
                        </span>

                    </div>
                `
            )
            .join("");
}


// =========================================================
// CSV EXPORT
// =========================================================

const exportButton =
    $("#exportButton");


if (exportButton) {

    exportButton.addEventListener(
        "click",
        async () => {

            try {

                const data =
                    await api(
                        "/api/export"
                    );


                const blob =
                    new Blob(
                        [data.csv],
                        {
                            type:
                                "text/csv;charset=utf-8;"
                        }
                    );


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const link =
                    document.createElement(
                        "a"
                    );


                link.href = url;

                link.download =
                    data.filename ||
                    "leads.csv";


                document.body
                    .appendChild(link);


                link.click();

                link.remove();


                URL.revokeObjectURL(
                    url
                );


                showToast(
                    "CSV exported"
                );


            } catch (error) {

                showToast(
                    error.message
                );
            }
        }
    );
}


// =========================================================
// GITHUB ANALYZER
// =========================================================

const githubButton =
    $("#githubButton");


if (githubButton) {

    githubButton.addEventListener(
        "click",
        analyzeGithub
    );
}


const githubUsername =
    $("#githubUsername");


if (githubUsername) {

    githubUsername.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                analyzeGithub();
            }
        }
    );
}


async function analyzeGithub() {

    const username =
        $("#githubUsername")
            ?.value
            .trim();


    const result =
        $("#githubResult");


    if (!username) {

        showToast(
            "Enter a GitHub username"
        );

        return;
    }


    if (!result) return;


    result.innerHTML =
        loadingHTML();


    try {

        const data =
            await api(
                `/api/github/${encodeURIComponent(
                    username
                )}`
            );


        result.innerHTML = `

            <div class="github-card">

                <div class="github-profile">

                    <img
                        class="github-avatar"
                        src="${escapeHTML(
                            data.avatar
                        )}"
                        alt="GitHub avatar"
                    >

                    <div>

                        <h3>
                            ${escapeHTML(
                                data.name ||
                                data.login
                            )}
                        </h3>

                        <p>
                            @${escapeHTML(
                                data.login
                            )}
                        </p>

                        <p>
                            ${escapeHTML(
                                data.bio ||
                                "No public bio available."
                            )}
                        </p>

                    </div>

                </div>


                <div class="github-stats">

                    <div class="github-stat">

                        <span>
                            Public Repositories
                        </span>

                        <strong>
                            ${data.public_repos ?? 0}
                        </strong>

                    </div>


                    <div class="github-stat">

                        <span>
                            Followers
                        </span>

                        <strong>
                            ${data.followers ?? 0}
                        </strong>

                    </div>


                    <div class="github-stat">

                        <span>
                            Following
                        </span>

                        <strong>
                            ${data.following ?? 0}
                        </strong>

                    </div>

                </div>


                <div class="ai-section">

                    <h4>
                        Top Languages
                    </h4>

                    <div class="language-list">

                        ${
                            (
                                data.top_languages ||
                                []
                            )
                            .map(
                                language => `

                                    <span
                                        class="language"
                                    >

                                        ${escapeHTML(
                                            language.name
                                        )}

                                        ·

                                        ${language.repos}
                                        repos

                                    </span>

                                `
                            )
                            .join("")
                        }

                    </div>

                </div>


                <div class="ai-section">

                    <a
                        href="${escapeHTML(
                            data.profile_url
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="primary-button"
                        style="
                            display:inline-flex;
                            align-items:center;
                            text-decoration:none;
                        "
                    >
                        View GitHub Profile
                    </a>

                </div>

            </div>
        `;


        showToast(
            "GitHub profile analyzed"
        );


    } catch (error) {

        result.innerHTML = `

            <div class="empty-state">

                <strong>
                    GitHub analysis failed
                </strong>

                <span>
                    ${escapeHTML(
                        error.message
                    )}
                </span>

            </div>
        `;
    }
}


// =========================================================
// REFRESH
// =========================================================

const refreshButton =
    $("#refreshButton");


if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        async () => {

            refreshButton.style.transform =
                "rotate(360deg)";


            setTimeout(() => {

                refreshButton.style.transform =
                    "";

            }, 500);


            await loadDashboard();


            showToast(
                "Dashboard refreshed"
            );
        }
    );
}


// =========================================================
// KEYBOARD SHORTCUT
// =========================================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "k"
        ) {

            event.preventDefault();

            showSection("search");

            $("#searchTitle")?.focus();
        }
    }
);


// =========================================================
// INITIALIZE
// =========================================================

async function initialize() {

    await loadDashboard();

    renderSavedLeads();

    updateAnalytics();
}


initialize();
