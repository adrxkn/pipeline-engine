from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    github_webhook_secret: str

    class Config:
        env_file = ".env"

settings = Settings()