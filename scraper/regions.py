CITY_TO_REGION: dict[str, str] = {
    # Lombardia
    'milano': 'Lombardia', 'bergamo': 'Lombardia', 'brescia': 'Lombardia',
    'como': 'Lombardia', 'cremona': 'Lombardia', 'lecco': 'Lombardia',
    'lodi': 'Lombardia', 'mantova': 'Lombardia', 'monza': 'Lombardia',
    'pavia': 'Lombardia', 'sondrio': 'Lombardia', 'varese': 'Lombardia',
    'segrate': 'Lombardia', 'sesto san giovanni': 'Lombardia',
    # Piemonte
    'torino': 'Piemonte', 'alessandria': 'Piemonte', 'asti': 'Piemonte',
    'biella': 'Piemonte', 'cuneo': 'Piemonte', 'novara': 'Piemonte',
    'verbania': 'Piemonte', 'vercelli': 'Piemonte',
    # Veneto
    'venezia': 'Veneto', 'verona': 'Veneto', 'padova': 'Veneto',
    'vicenza': 'Veneto', 'treviso': 'Veneto', 'rovigo': 'Veneto',
    'belluno': 'Veneto', 'piazzola sul brenta': 'Veneto',
    # Emilia-Romagna
    'bologna': 'Emilia-Romagna', 'parma': 'Emilia-Romagna',
    'modena': 'Emilia-Romagna', 'reggio emilia': 'Emilia-Romagna',
    'ferrara': 'Emilia-Romagna', 'ravenna': 'Emilia-Romagna',
    'rimini': 'Emilia-Romagna', 'forlì': 'Emilia-Romagna',
    'cesena': 'Emilia-Romagna', 'piacenza': 'Emilia-Romagna',
    # Toscana
    'firenze': 'Toscana', 'prato': 'Toscana', 'livorno': 'Toscana',
    'pistoia': 'Toscana', 'pisa': 'Toscana', 'arezzo': 'Toscana',
    'siena': 'Toscana', 'lucca': 'Toscana', 'grosseto': 'Toscana',
    'massa': 'Toscana',
    # Lazio
    'roma': 'Lazio', 'viterbo': 'Lazio', 'rieti': 'Lazio',
    'frosinone': 'Lazio', 'latina': 'Lazio',
    # Campania
    'napoli': 'Campania', 'salerno': 'Campania', 'caserta': 'Campania',
    'avellino': 'Campania', 'benevento': 'Campania',
    # Puglia
    'bari': 'Puglia', 'taranto': 'Puglia', 'foggia': 'Puglia',
    'lecce': 'Puglia', 'brindisi': 'Puglia', 'andria': 'Puglia',
    'barletta': 'Puglia', 'trani': 'Puglia',
    # Sicilia
    'palermo': 'Sicilia', 'catania': 'Sicilia', 'messina': 'Sicilia',
    'ragusa': 'Sicilia', 'siracusa': 'Sicilia', 'agrigento': 'Sicilia',
    'caltanissetta': 'Sicilia', 'enna': 'Sicilia', 'trapani': 'Sicilia',
    # Sardegna
    'cagliari': 'Sardegna', 'sassari': 'Sardegna', 'nuoro': 'Sardegna',
    'oristano': 'Sardegna',
    # Liguria
    'genova': 'Liguria', 'la spezia': 'Liguria', 'savona': 'Liguria',
    'imperia': 'Liguria',
    # Marche
    'ancona': 'Marche', 'pesaro': 'Marche', 'macerata': 'Marche',
    'ascoli piceno': 'Marche', 'fermo': 'Marche', 'treia': 'Marche',
    # Abruzzo
    'pescara': 'Abruzzo', "l'aquila": 'Abruzzo', 'chieti': 'Abruzzo',
    'teramo': 'Abruzzo',
    # Umbria
    'perugia': 'Umbria', 'terni': 'Umbria',
    # Friuli-Venezia Giulia
    'trieste': 'Friuli-Venezia Giulia', 'udine': 'Friuli-Venezia Giulia',
    'gorizia': 'Friuli-Venezia Giulia', 'pordenone': 'Friuli-Venezia Giulia',
    # Trentino-Alto Adige
    'trento': 'Trentino-Alto Adige', 'bolzano': 'Trentino-Alto Adige',
    # Calabria
    'catanzaro': 'Calabria', 'reggio calabria': 'Calabria',
    'cosenza': 'Calabria', 'crotone': 'Calabria', 'vibo valentia': 'Calabria',
    # Basilicata
    'potenza': 'Basilicata', 'matera': 'Basilicata',
    # Molise
    'campobasso': 'Molise', 'isernia': 'Molise',
    # Valle d'Aosta
    "aosta": "Valle d'Aosta",
}

ITALIAN_REGIONS = [
    'Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna',
    'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche',
    'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana',
    'Trentino-Alto Adige', 'Umbria', "Valle d'Aosta", 'Veneto',
]

# Città principali per regione (usate per query geografiche)
REGION_CITIES: dict[str, list[str]] = {
    'Lombardia':             ['Milano', 'Bergamo', 'Brescia', 'Como', 'Varese', 'Mantova', 'Cremona', 'Pavia', 'Lecco', 'Monza', 'Lodi', 'Sondrio'],
    'Piemonte':              ['Torino', 'Novara', 'Asti', 'Alessandria', 'Cuneo', 'Vercelli', 'Biella', 'Verbania'],
    'Veneto':                ['Venezia', 'Verona', 'Padova', 'Vicenza', 'Treviso', 'Rovigo', 'Belluno', 'Mestre'],
    'Emilia-Romagna':        ['Bologna', 'Modena', 'Parma', 'Rimini', 'Ferrara', 'Ravenna', 'Reggio Emilia', 'Forlì', 'Cesena', 'Piacenza'],
    'Toscana':               ['Firenze', 'Pisa', 'Siena', 'Arezzo', 'Lucca', 'Livorno', 'Pistoia', 'Prato', 'Grosseto', 'Massa'],
    'Lazio':                 ['Roma', 'Latina', 'Viterbo', 'Frosinone', 'Rieti', 'Tivoli', 'Civitavecchia'],
    'Campania':              ['Napoli', 'Salerno', 'Caserta', 'Avellino', 'Benevento', 'Pozzuoli', 'Castellammare di Stabia'],
    'Puglia':                ['Bari', 'Taranto', 'Lecce', 'Foggia', 'Brindisi', 'Andria', 'Barletta', 'Trani'],
    'Sicilia':               ['Palermo', 'Catania', 'Messina', 'Siracusa', 'Agrigento', 'Trapani', 'Ragusa', 'Caltanissetta', 'Enna'],
    'Sardegna':              ['Cagliari', 'Sassari', 'Nuoro', 'Oristano', 'Olbia', 'Alghero'],
    'Liguria':               ['Genova', 'La Spezia', 'Savona', 'Imperia', 'Sanremo', 'Rapallo', 'Chiavari'],
    'Marche':                ['Ancona', 'Pesaro', 'Macerata', 'Ascoli Piceno', 'Fermo', 'Senigallia', 'Urbino', 'Fabriano'],
    'Abruzzo':               ["L'Aquila", 'Pescara', 'Chieti', 'Teramo', 'Lanciano', 'Avezzano', 'Vasto'],
    'Umbria':                ['Perugia', 'Terni', 'Foligno', 'Spoleto', 'Orvieto', 'Assisi', 'Città di Castello', 'Gubbio'],
    'Friuli-Venezia Giulia': ['Trieste', 'Udine', 'Pordenone', 'Gorizia', 'Monfalcone'],
    'Trentino-Alto Adige':   ['Trento', 'Bolzano', 'Rovereto', 'Merano', 'Bressanone'],
    'Calabria':              ['Reggio Calabria', 'Catanzaro', 'Cosenza', 'Crotone', 'Vibo Valentia', 'Lamezia Terme'],
    'Basilicata':            ['Potenza', 'Matera', 'Melfi', 'Policoro'],
    'Molise':                ['Campobasso', 'Isernia', 'Termoli'],
    "Valle d'Aosta":         ['Aosta', 'Courmayeur', 'Saint-Vincent'],
}

# Fonti web per regione (siti regionali, proloco, giornali locali)
REGION_LOCAL_SITES: dict[str, list[str]] = {
    'Toscana':    ['firenzetoday.it', 'toscanatoday.it', 'visittuscany.com', 'fieraantiquaria.org'],
    'Lombardia':  ['milanotoday.it', 'bergamotoday.it', 'bresciatoday.it', 'vivimilano.corriere.it'],
    'Lazio':      ['romatoday.it', 'romafacile.it', 'turismoroma.it'],
    'Piemonte':   ['torinotoday.it', 'cuneotoday.it', 'granbalondetorino.it'],
    'Campania':   ['napolitoday.it', 'campaniatoday.it', 'napolifanpage.it'],
    'Veneto':     ['veneziatoday.it', 'veronatoday.it', 'padovatoday.it'],
    'Emilia-Romagna': ['bolognawelcome.it', 'bologna2000.com', 'emiliaromagnaturismo.it'],
    'Sicilia':    ['palermotoday.it', 'cataniatoday.it', 'messinatoday.it'],
    'Puglia':     ['baritoday.it', 'lecceprima.it', 'tarantotoday.it'],
    'Liguria':    ['genovatoday.it', 'lavocedigenova.it'],
    'Marche':     ['anconatoday.it', 'pesaronotizie.it'],
    'Abruzzo':    ['pescara.occhio.news', 'ilcentro.it'],
    'Umbria':     ['perugiatoday.it', 'umbriatoday.it'],
    'Sardegna':   ['cagliari.vistanet.it', 'sardiniapost.it'],
    'Friuli-Venezia Giulia': ['triesteprima.it', 'udinese.it'],
    'Trentino-Alto Adige':   ['trentotoday.it', 'altoadige.it'],
    'Calabria':   ['reggiotoday.it', 'catanzaroinforma.it'],
    'Basilicata': ['basilicatapost.it', 'lagazzettadelmezzogiorno.it'],
    'Molise':     ['primonumero.it', 'molise24.it'],
    "Valle d'Aosta": ['aostasera.it', 'aostaoggi.it'],
}


def city_to_region(city: str) -> str:
    return CITY_TO_REGION.get(city.lower().strip(), 'Italia')
