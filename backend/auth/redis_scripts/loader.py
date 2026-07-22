from importlib.resources import files


def load_lua_script(filename: str) -> str:
    return (
        files("auth.redis_scripts")
        .joinpath(filename)
        .read_text(encoding="utf-8")
    )