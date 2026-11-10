import re
from typing import Dict, Iterable, List, Set

# Configurable canonical skill dictionary (maps lowercase alias -> canonical display name)
DEFAULT_SKILL_ALIASES: Dict[str, str] = {
    # JavaScript / TypeScript / Frontend
    "js": "JavaScript",
    "javascript": "JavaScript",
    "ecmascript": "JavaScript",
    "es6": "JavaScript",
    "ts": "TypeScript",
    "typescript": "TypeScript",
    "react": "React.js",
    "reactjs": "React.js",
    "react.js": "React.js",
    "react js": "React.js",
    "nextjs": "Next.js",
    "next.js": "Next.js",
    "next js": "Next.js",
    "vue": "Vue.js",
    "vuejs": "Vue.js",
    "vue.js": "Vue.js",
    "angular": "Angular",
    "angularjs": "AngularJS",
    "redux": "Redux",
    "tailwind": "Tailwind CSS",
    "tailwindcss": "Tailwind CSS",
    "tailwind css": "Tailwind CSS",
    "html": "HTML5",
    "html5": "HTML5",
    "css": "CSS3",
    "css3": "CSS3",

    # Backend & Languages
    "node": "Node.js",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "node js": "Node.js",
    "express": "Express.js",
    "expressjs": "Express.js",
    "express.js": "Express.js",
    "nestjs": "NestJS",
    "nest.js": "NestJS",
    "python": "Python",
    "py": "Python",
    "python3": "Python",
    "fastapi": "FastAPI",
    "fast api": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "celery": "Celery",
    "sqlalchemy": "SQLAlchemy",
    "alembic": "Alembic",
    "pydantic": "Pydantic",
    "java": "Java",
    "spring": "Spring Framework",
    "springboot": "Spring Boot",
    "spring boot": "Spring Boot",
    "golang": "Go",
    "go": "Go",
    "c#": "C#",
    "csharp": "C#",
    ".net": ".NET",
    "dotnet": ".NET",
    "c++": "C++",
    "cpp": "C++",
    "rust": "Rust",
    "php": "PHP",
    "ruby": "Ruby",
    "rails": "Ruby on Rails",
    "ruby on rails": "Ruby on Rails",

    # Databases & Search
    "postgres": "PostgreSQL",
    "postgresql": "PostgreSQL",
    "psql": "PostgreSQL",
    "pgvector": "pgvector",
    "mysql": "MySQL",
    "mariadb": "MariaDB",
    "mongodb": "MongoDB",
    "mongo": "MongoDB",
    "redis": "Redis",
    "elasticsearch": "Elasticsearch",
    "elastic search": "Elasticsearch",
    "prisma": "Prisma",
    "sql": "SQL",
    "nosql": "NoSQL",
    "graphql": "GraphQL",
    "rest": "REST API",
    "rest api": "REST API",
    "restful api": "REST API",
    "grpc": "gRPC",

    # Cloud, DevOps & Containers
    "aws": "AWS",
    "amazon web services": "AWS",
    "gcp": "Google Cloud Platform",
    "google cloud": "Google Cloud Platform",
    "azure": "Microsoft Azure",
    "docker": "Docker",
    "k8s": "Kubernetes",
    "kubernetes": "Kubernetes",
    "terraform": "Terraform",
    "ci/cd": "CI/CD",
    "cicd": "CI/CD",
    "github actions": "GitHub Actions",
    "jenkins": "Jenkins",
    "linux": "Linux",
    "git": "Git",
    "kafka": "Apache Kafka",
    "apache kafka": "Apache Kafka",
    "rabbitmq": "RabbitMQ",

    # Data & AI
    "machine learning": "Machine Learning",
    "ml": "Machine Learning",
    "deep learning": "Deep Learning",
    "pytorch": "PyTorch",
    "tensorflow": "TensorFlow",
    "scikit-learn": "Scikit-Learn",
    "sklearn": "Scikit-Learn",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "llm": "Large Language Models",
    "rag": "RAG",
}


class SkillNormalizer:
    """
    Normalizes raw skill strings into canonical technology names while preserving
    distinct technologies (e.g., never merging Java with JavaScript or Angular with AngularJS).
    """

    def __init__(self, custom_aliases: Dict[str, str] | None = None) -> None:
        self.aliases: Dict[str, str] = dict(DEFAULT_SKILL_ALIASES)
        if custom_aliases:
            for k, v in custom_aliases.items():
                self.aliases[self._clean_key(k)] = v.strip()

    @staticmethod
    def _clean_key(raw: str) -> str:
        text = re.sub(r"\s+", " ", str(raw or "").strip().lower())
        return text

    def normalize_one(self, skill: str) -> str:
        if not skill or not str(skill).strip():
            return ""
        cleaned_raw = re.sub(r"\s+", " ", str(skill).strip())
        key = self._clean_key(cleaned_raw)
        if key in self.aliases:
            return self.aliases[key]
        # Strip trailing version numbers like "Python 3.11" -> check "python"
        stripped_ver = re.sub(r"\s+\d+(\.\d+)*$", "", key)
        if stripped_ver in self.aliases:
            return self.aliases[stripped_ver]
        return cleaned_raw

    def normalize_many(self, skills: Iterable[str]) -> List[str]:
        seen: Set[str] = set()
        result: List[str] = []
        for s in skills or []:
            norm = self.normalize_one(s)
            if not norm:
                continue
            low = norm.lower()
            if low not in seen:
                seen.add(low)
                result.append(norm)
        return result

    def extract_known_skills_from_text(self, text: str) -> List[str]:
        """Fast deterministic pass to identify canonical skills present in raw resume/job text."""
        if not text:
            return []
        lowered = text.lower()
        found: List[str] = []
        seen: Set[str] = set()

        for alias, canonical in self.aliases.items():
            if len(alias) <= 1:
                continue
            pattern = r"(?<![a-z0-9_])" + re.escape(alias) + r"(?![a-z0-9_])"
            if re.search(pattern, lowered):
                low_canon = canonical.lower()
                if low_canon not in seen:
                    seen.add(low_canon)
                    found.append(canonical)
        return found


default_skill_normalizer = SkillNormalizer()


def normalize_skill_list(skills: Iterable[str]) -> List[str]:
    return default_skill_normalizer.normalize_many(skills or [])


def compute_skill_overlap(
    candidate_skills: Iterable[str],
    target_skills: Iterable[str],
) -> Dict[str, object]:
    norm_cand = default_skill_normalizer.normalize_many(candidate_skills or [])
    norm_target = default_skill_normalizer.normalize_many(target_skills or [])
    cand_lower = {s.lower(): s for s in norm_cand}

    matched: List[str] = []
    missing: List[str] = []
    for t in norm_target:
        if t.lower() in cand_lower:
            matched.append(t)
        else:
            missing.append(t)

    ratio = (len(matched) / len(norm_target)) if norm_target else 1.0
    return {
        "matched": matched,
        "missing": missing,
        "match_ratio": round(float(ratio), 4),
    }

