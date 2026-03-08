import arqon_maestro.config


def data_path(*args):
    return arqon_maestro.config.library_path("code-engine-training", "data", *args)


def model_path(*args):
    return arqon_maestro.config.library_path("code-engine-training", "models", *args)
