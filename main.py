from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional
import csv
import io
import os
import json
import httpx

app = FastAPI(
    title="AI Lead Intelligence Platform",
    version="1.0.0"
)

# ---------------------------------------------------------
# DEMO LEAD DATA
# ---------------------------------------------------------
# This is synthetic demo data.
# The application does NOT scrape LinkedIn.
# ---------------------------------------------------------

LEADS = [
    {
        "id": 1,
        "name": "Sarah Chen",
        "title": "Senior Frontend Engineer",
        "company": "Microsoft",
        "location": "Seattle, WA",
        "industry": "Technology",
        "experience": "Senior",
        "skills": ["React", "TypeScript", "Azure", "JavaScript"],
        "avatar": "SC"
    },
    {
        "id": 2,
        "name": "Daniel Kim",
        "title": "Engineering Manager",
        "company": "Google",
        "location": "Mountain View, CA",
        "industry": "Technology",
        "experience": "Lead",
        "skills": ["React", "Python", "GCP", "Leadership"],
        "avatar": "DK"
    },
    {
        "id": 3,
        "name": "Priya Sharma",
        "title": "Frontend Developer",
        "company": "Adobe",
        "location": "San Jose, CA",
        "industry": "Technology",
        "experience": "Mid",
        "skills": ["React", "JavaScript", "CSS", "Figma"],
        "avatar": "PS"
    },
    {
        "id": 4,
        "name": "Michael Torres",
        "title": "Product Engineer",
        "company": "Meta",
        "location": "Menlo Park, CA",
        "industry": "Technology",
        "experience": "Senior",
        "skills": ["React", "Next.js", "GraphQL", "TypeScript"],
        "avatar": "MT"
    },
    {
        "id": 5,
        "name": "Emily Johnson",
        "title": "Software Engineer",
        "company": "Amazon",
        "location": "Bellevue, WA",
        "industry": "E-commerce",
        "experience": "Mid",
        "skills": ["JavaScript", "React", "AWS", "Node.js"],
        "avatar": "EJ"
    },
    {
        "id": 6,
        "name": "Arjun Patel",
        "title": "Full Stack Engineer",
        "company": "Salesforce",
        "location": "San Francisco, CA",
        "industry": "SaaS",
        "experience": "Senior",
        "skills": ["React", "Node.js", "PostgreSQL", "AWS"],
        "avatar": "AP"
    },
    {
        "id": 7,
        "name": "Olivia Martin",
        "title": "UI Engineer",
        "company": "Netflix",
        "location": "Los Gatos, CA",
        "industry": "Media",
        "experience": "Senior",
        "skills": ["React", "CSS", "Design Systems", "JavaScript"],
        "avatar": "OM"
    },
    {
        "id": 8,
        "name": "James Wilson",
        "title": "Frontend Engineering Lead",
        "company": "Stripe",
        "location": "New York, NY",
        "industry": "Fintech",
        "experience": "Lead",
        "skills": ["React", "TypeScript", "Next.js", "APIs"],
        "avatar": "JW"
    },
    {
        "id": 9,
        "name": "Neha Reddy",
        "title": "Software Developer",
        "company": "Atlassian",
        "location": "Austin, TX",
        "industry": "SaaS",
        "experience": "Mid",
        "skills": ["React", "JavaScript", "Python", "Git"],
        "avatar": "NR"
    },
    {
        "id": 10,
        "name": "Lucas Brown",
        "title": "Senior Product Engineer",
        "company": "Shopify",
        "location": "Toronto, Canada",
        "industry": "E-commerce",
        "experience": "Senior",
        "skills": ["React", "Ruby", "GraphQL", "TypeScript"],
        "avatar": "LB"
    },
    {
        "id": 11,
        "name": "Ava Williams",
        "title": "Frontend Engineer",
        "company": "NVIDIA",
        "location": "Santa Clara, CA",
        "industry": "AI",
        "experience": "Mid",
        "skills": ["React", "TypeScript", "WebGL", "JavaScript"],
        "avatar": "AW"
    },
    {
        "id": 12,
        "name": "Rohan Mehta",
        "title": "Engineering Manager",
        "company": "Uber",
        "location": "San Francisco, CA",
        "industry": "Mobility",
        "experience": "Lead",
        "skills": ["React", "Python", "Kubernetes", "Leadership"],
        "avatar": "RM"
    }
]


# ---------------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------------

class SearchRequest(BaseModel):
    title: str = ""
    company: str = ""
    location: str = ""
    industry: str = ""
    experience: str = ""
    keywords: str = ""


class AIRequest(BaseModel):
    lead_id: int
    action: str = Field(
        pattern="^(analyze|message)$"
    )
    tone: str = "professional"


class GithubRequest(BaseModel):
    username: str


# ---------------------------------------------------------
# LEAD SCORING
# ---------------------------------------------------------

def score_lead(lead, req: SearchRequest):

    text = " ".join(
        [
            lead["name"],
            lead["title"],
            lead["company"],
            lead["location"],
            lead["industry"]
        ] + lead["skills"]
    ).lower()

    score = 40
    reasons = []

    # Job title
    if req.title:

        query = req.title.lower()

        if query in lead["title"].lower():
            score += 25
            reasons.append("Title is a strong match")

        elif any(
            word in lead["title"].lower()
            for word in query.split()
            if len(word) > 2
        ):
            score += 12
            reasons.append("Title has relevant keywords")

    # Company
    if req.company:

        if req.company.lower() in lead["company"].lower():
            score += 15
            reasons.append("Company matches")

    # Location
    if req.location:

        if req.location.lower() in lead["location"].lower():
            score += 10
            reasons.append("Location matches")

    # Industry
    if req.industry:

        if req.industry.lower() == lead["industry"].lower():
            score += 8
            reasons.append("Industry matches")

    # Experience
    if req.experience:

        if req.experience.lower() == lead["experience"].lower():
            score += 7
            reasons.append("Experience level matches")

    # Keywords
    if req.keywords:

        keywords = [
            k.strip().lower()
            for k in req.keywords.split(",")
            if k.strip()
        ]

        hits = [
            keyword
            for keyword in keywords
            if keyword in text
        ]

        if hits:

            score += min(
                15,
                len(hits) * 5
            )

            reasons.append(
                "Relevant keywords: "
                + ", ".join(hits[:4])
            )

    score = min(score, 99)

    if not reasons:

        reasons = [
            "Relevant professional profile "
            "in the selected dataset"
        ]

    return score, reasons


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------

@app.get("/api/health")
def health():

    return {
        "status": "ok",
        "service": "AI Lead Intelligence Platform"
    }


# ---------------------------------------------------------
# SEARCH API
# ---------------------------------------------------------

@app.post("/api/search")
def search(req: SearchRequest):

    results = []

    for lead in LEADS:

        text = " ".join(
            [
                lead["name"],
                lead["title"],
                lead["company"],
                lead["location"],
                lead["industry"]
            ] + lead["skills"]
        ).lower()

        checks = [

            (
                req.title,
                req.title.lower()
                in lead["title"].lower()
                if req.title
                else True
            ),

            (
                req.company,
                req.company.lower()
                in lead["company"].lower()
                if req.company
                else True
            ),

            (
                req.location,
                req.location.lower()
                in lead["location"].lower()
                if req.location
                else True
            ),

            (
                req.industry,
                req.industry.lower()
                == lead["industry"].lower()
                if req.industry
                else True
            ),

            (
                req.experience,
                req.experience.lower()
                == lead["experience"].lower()
                if req.experience
                else True
            ),

            (
                req.keywords,
                any(
                    keyword.strip().lower()
                    in text
                    for keyword
                    in req.keywords.split(",")
                    if keyword.strip()
                )
                if req.keywords
                else True
            )
        ]

        if all(ok for _, ok in checks):

            score, reasons = score_lead(
                lead,
                req
            )

            item = {
                **lead,
                "score": score,
                "reasons": reasons
            }

            results.append(item)

    results.sort(
        key=lambda x: x["score"],
        reverse=True
    )

    return {
        "count": len(results),
        "results": results
    }


# ---------------------------------------------------------
# FALLBACK AI
# ---------------------------------------------------------

def fallback_ai(
    lead,
    action,
    tone
):

    score, reasons = score_lead(
        lead,
        SearchRequest(
            title=lead["title"]
        )
    )

    if action == "analyze":

        return {

            "headline":
                f"{score}/100 match",

            "summary":
                f"{lead['name']} is a "
                f"{lead['title']} at "
                f"{lead['company']} with a "
                f"strong technical profile for "
                f"frontend-oriented outreach.",

            "strengths":
                lead["skills"][:4],

            "reasons":
                reasons,

            "next_step":
                "Review the profile, confirm relevance, "
                "then personalize your outreach around "
                "one specific technical or product area."
        }

    messages = {

        "professional":
            f"Hi {lead['name'].split()[0]}, "
            f"I came across your work as a "
            f"{lead['title']} at {lead['company']} "
            f"and was impressed by your experience "
            f"with {lead['skills'][0]} and "
            f"{lead['skills'][1]}. "
            f"I'm building projects in frontend "
            f"development and would value connecting "
            f"and learning from your perspective.",

        "friendly":
            f"Hi {lead['name'].split()[0]}! "
            f"Your work as a {lead['title']} at "
            f"{lead['company']} caught my attention, "
            f"especially your experience with "
            f"{lead['skills'][0]}. "
            f"I'm exploring frontend engineering "
            f"and would love to connect.",

        "concise":
            f"Hi {lead['name'].split()[0]}, "
            f"I'm building my frontend engineering "
            f"portfolio and noticed your experience "
            f"at {lead['company']}. "
            f"I'd love to connect and learn from "
            f"your journey."
    }

    return {
        "message":
            messages.get(
                tone,
                messages["professional"]
            )
    }


# ---------------------------------------------------------
# OPENAI API
# ---------------------------------------------------------

async def call_openai(prompt):

    api_key = os.getenv(
        "OPENAI_API_KEY"
    )

    if not api_key:
        return None

    model = os.getenv(
        "OPENAI_MODEL",
        "gpt-5-mini"
    )

    payload = {

        "model": model,

        "input": prompt,

        "max_output_tokens": 700
    }

    headers = {

        "Authorization":
            f"Bearer {api_key}",

        "Content-Type":
            "application/json"
    }

    async with httpx.AsyncClient(
        timeout=30
    ) as client:

        response = await client.post(
            "https://api.openai.com/v1/responses",
            headers=headers,
            json=payload
        )

        if response.status_code >= 400:
            return None

        data = response.json()

        text = data.get(
            "output_text"
        )

        if text:
            return text

        parts = []

        for item in data.get(
            "output",
            []
        ):

            for content in item.get(
                "content",
                []
            ):

                if content.get(
                    "type"
                ) == "output_text":

                    parts.append(
                        content.get(
                            "text",
                            ""
                        )
                    )

        return "\n".join(
            parts
        ).strip() or None


# ---------------------------------------------------------
# AI API
# ---------------------------------------------------------

@app.post("/api/ai")
async def ai(req: AIRequest):

    lead = next(
        (
            lead
            for lead in LEADS
            if lead["id"] == req.lead_id
        ),
        None
    )

    if not lead:
        raise HTTPException(
            404,
            "Lead not found"
        )

    # AI profile analysis
    if req.action == "analyze":

        prompt = f"""
You are a B2B lead intelligence analyst.

Analyze this synthetic demo lead.

Lead:
{json.dumps(lead)}

Return concise JSON with:

headline
summary
strengths
risks
next_step

Do not claim private information.
Do not invent facts.
Only use the supplied information.
"""

    # AI message
    else:

        prompt = f"""
Write one concise professional networking
message for this synthetic demo lead.

Lead:
{json.dumps(lead)}

Tone:
{req.tone}

Do not claim a previous interaction.
Do not fabricate facts.
Keep it under 500 characters.
"""

    ai_result = await call_openai(
        prompt
    )

    if ai_result:

        if req.action == "message":

            return {
                "mode": "llm",
                "message": ai_result
            }

        try:

            parsed = json.loads(
                ai_result
            )

            return {
                "mode": "llm",
                **parsed
            }

        except Exception:

            return {
                "mode": "llm",
                "summary": ai_result
            }

    # No API key → fallback
    return {
        "mode": "fallback",
        **fallback_ai(
            lead,
            req.action,
            req.tone
        )
    }


# ---------------------------------------------------------
# CSV EXPORT
# ---------------------------------------------------------

@app.get("/api/export")
def export_csv():

    output = io.StringIO()

    fields = [
        "name",
        "title",
        "company",
        "location",
        "industry",
        "experience",
        "skills"
    ]

    writer = csv.DictWriter(
        output,
        fieldnames=fields
    )

    writer.writeheader()

    for lead in LEADS:

        row = {
            field:
                lead[field]
                if field != "skills"
                else ", ".join(
                    lead[field]
                )
            for field in fields
        }

        writer.writerow(row)

    return {
        "filename":
            "lead-intelligence-demo.csv",

        "csv":
            output.getvalue()
    }


# ---------------------------------------------------------
# GITHUB ANALYZER
# ---------------------------------------------------------

@app.get("/api/github/{username}")
async def github(username: str):

    url = (
        f"https://api.github.com/users/"
        f"{username}"
    )

    headers = {

        "Accept":
            "application/vnd.github+json",

        "User-Agent":
            "AI-Lead-Intelligence-Platform"
    }

    async with httpx.AsyncClient(
        timeout=15
    ) as client:

        response = await client.get(
            url,
            headers=headers
        )

        if response.status_code == 404:

            raise HTTPException(
                404,
                "GitHub user not found"
            )

        if response.status_code >= 400:

            raise HTTPException(
                response.status_code,
                "GitHub API request failed"
            )

        user = response.json()

        repos_response = await client.get(

            f"https://api.github.com/users/"
            f"{username}/repos"
            f"?per_page=100&sort=updated",

            headers=headers
        )

        repos = (
            repos_response.json()
            if repos_response.status_code == 200
            else []
        )

    languages = {}

    for repo in repos:

        language = repo.get(
            "language"
        )

        if language:

            languages[language] = (
                languages.get(
                    language,
                    0
                ) + 1
            )

    top_languages = sorted(
        languages.items(),
        key=lambda x: x[1],
        reverse=True
    )[:6]

    return {

        "name":
            user.get("name")
            or username,

        "login":
            user.get("login"),

        "bio":
            user.get("bio"),

        "avatar":
            user.get("avatar_url"),

        "public_repos":
            user.get(
                "public_repos",
                0
            ),

        "followers":
            user.get(
                "followers",
                0
            ),

        "following":
            user.get(
                "following",
                0
            ),

        "profile_url":
            user.get(
                "html_url"
            ),

        "top_languages": [
            {
                "name": language,
                "repos": count
            }
            for language, count
            in top_languages
        ]
    }


# ---------------------------------------------------------
# FRONTEND
# ---------------------------------------------------------

app.mount(
    "/static",
    StaticFiles(
        directory="static"
    ),
    name="static"
)


@app.get("/")
def index():

    return FileResponse(
        "static/index.html"
    )
