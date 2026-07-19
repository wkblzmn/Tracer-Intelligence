import requests
jobs = requests.get("https://studio.skill.jobs/api/job_search/?limit=15&offset=0").json()["results"]
for j in jobs:
    d = requests.get(f"https://studio.skill.jobs/api/job_search/{j['slug']}/").json()
    sk = d.get("skills_list") or []
    txt = bool((d.get("job_responsibility") or "") + (d.get("qualification") or ""))
    print(f"{len(sk):>2} skills | text={txt} | {j['slug'][:40]}")