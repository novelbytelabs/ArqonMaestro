import arqon_maestro.config


def intermediate_path(*args):
    return arqon_maestro.config.library_path("lm", "model-data", *args)


def output_path(*args):
    return arqon_maestro.config.library_path("lm", "model", *args)
