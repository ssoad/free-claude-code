from pydantic_settings import BaseSettings, SettingsConfigDict
class TestSettings(BaseSettings):
    my_token: str = "default"
    model_config = SettingsConfigDict(env_file=".test_env")
settings = TestSettings()
print(settings.my_token)
