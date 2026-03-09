#!/usr/bin/env python3

import click
import os.path
import platform
import subprocess
import sys

sys.path.append(
    os.path.join(
        os.getenv("ARQON_MAESTRO_SOURCE_ROOT") or os.getenv("SERENADE_SOURCE_ROOT") or os.path.expanduser("~/arqon-maestro"),
        "scripts",
    )
)
import arqon_maestro.config


@click.command()
@click.argument("output")
def main(output):
    """Update tree-sitter repositories and build shared library"""
    languages = arqon_maestro.config.languages()
    os.makedirs(arqon_maestro.config.library_path("tree-sitter"), exist_ok=True)
    dev_tree_sitter = bool(os.getenv("DEV_TREE_SITTER"))

    updated = False
    cwd = os.getcwd()
    for language, data in {**languages["languages"], **languages["libraries"]}.items():
        path = arqon_maestro.config.library_path(
            "tree-sitter", data.get("path", data["repository"].split("/")[-1])
        )
        if not os.path.exists(path):
            updated = True
            subprocess.check_call(
                f"git clone --recursive https://github.com/{data['repository']} {path}",
                shell=True,
            )
        os.chdir(path)
        head = subprocess.check_output("git rev-parse HEAD", shell=True).decode("utf-8").strip()

        if head != data["commit"]:
            updated = True
            subprocess.check_call(
                f"git reset --hard && git fetch && git checkout {data['commit']}",
                shell=True,
            )
    os.chdir(cwd)

    output_library = output + (".dylib" if platform.system() == "Darwin" else ".so")
    if not updated and os.path.exists(output_library) and not dev_tree_sitter:
        try:
            symbols = subprocess.check_output(["nm", "-D", output_library], text=True)
            if "Java_ai_arqon_maestro_treesitter" in symbols:
                sys.exit(0)
        except Exception:
            pass

    paths = []
    prefix = arqon_maestro.config.library_path("tree-sitter")
    dev_prefix = arqon_maestro.config.library_path("dev-tree-sitter")
    for language, data in languages["languages"].items():
        path = data.get("path", data["repository"].split("/")[-1])
        if data.get("grammar"):
            path += f"/{data['grammar']}"

        path = (
            f"{dev_prefix}/{path}"
            if dev_tree_sitter and os.path.exists(f"{dev_prefix}/{path}")
            else f"{prefix}/{path}"
        )
        paths.append(path)

        subprocess.check_call(
            [
                arqon_maestro.config.source_path(
                    "grammarflattener",
                    "build",
                    "install",
                    "grammarflattener",
                    "bin",
                    "grammarflattener",
                ),
                path,
                language,
                arqon_maestro.config.source_path("core", "src", "main", "resources", "grammars"),
            ]
        )

    os.makedirs(os.path.dirname(output), exist_ok=True)
    source_java_tree_sitter = arqon_maestro.config.source_path("tree-sitter", "java-tree-sitter", "build.py")
    if os.path.exists(source_java_tree_sitter):
        build_script = source_java_tree_sitter
    elif dev_tree_sitter and os.path.exists(f"{dev_prefix}/java-tree-sitter"):
        build_script = f"{dev_prefix}/java-tree-sitter/build.py"
    else:
        build_script = f"{prefix}/java-tree-sitter/build.py"

    subprocess.check_call(
        [build_script, "-o", output]
        + (["-a", "x86_64"] if platform.system() == "Darwin" else [])
        + paths,
    )


if __name__ == "__main__":
    main()
