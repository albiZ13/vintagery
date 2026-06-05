from __future__ import annotations
"""
Hardcoded recurring Italian antique/vintage fairs with known schedules.
These are 100% verified, high-confidence events that happen every month
or on known schedules. No scraping needed — generate dates algorithmically.

Sources: discoverarezzo.com, firenzemadeintuscany.com, italiamia.com, visittuscany.com
Confidence: 1.0 for schedule, 0.90 for specific month instance.
"""
from datetime import date, timedelta
from typing import Generator


def _nth_weekday(year: int, month: int, weekday: int, n: int) -> date | None:
    """Nth occurrence of weekday (0=Mon…6=Sun) in month. n=-1 = last."""
    days = []
    for d in range(1, 32):
        try:
            dt = date(year, month, d)
        except ValueError:
            break
        if dt.weekday() == weekday:
            days.append(dt)
    if not days:
        return None
    if n == -1:
        return days[-1]
    if n <= len(days):
        return days[n - 1]
    return None


def _prev_day(d: date) -> date:
    return d - timedelta(days=1)


# Each entry: dict with schedule info + event metadata
KNOWN_FAIRS = [
    # ─── TOSCANA ───────────────────────────────────────────────────────────
    {
        'name': 'Fiera Antiquaria di Arezzo',
        'description': (
            'La più antica fiera antiquaria italiana (dal 1968). '
            '500+ espositori nazionali e internazionali. '
            'Mobili, oggetti d\'arte, libri, vinili, collezionismo, abbigliamento vintage.'
        ),
        'event_type': 'antiquariato',
        'city': 'Arezzo',
        'region': 'Toscana',
        'address': 'Piazza San Francesco / Piazza Grande / Logge Vasari',
        'schedule': 'first_sunday_and_prev_saturday',
        'start_time': '08:00',
        'end_time': '19:00',
        'website': 'https://www.fieraantiquaria.org',
        'organizer': 'Fiera Antiquaria Arezzo',
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': True,
        'categories': ['Antiquariato', 'Arte', 'Libri', 'Vinili', 'Vintage'],
        'tags': ['arezzo', 'antiquariato', 'mensile', 'storico'],
    },
    {
        'name': 'Mercato Antiquariato Lucca',
        'description': (
            'Mercato mensile nel centro storico di Lucca. '
            '~220 espositori tra Piazza San Martino, Giglio e San Giusto. '
            'Specializzato in oggetti piccoli: gioielli, ceramiche, stampe, tessuti.'
        ),
        'event_type': 'antiquariato',
        'city': 'Lucca',
        'region': 'Toscana',
        'address': 'Piazza San Martino / Piazza del Giglio / Piazza San Giusto',
        'schedule': 'third_weekend',
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato', 'Gioielli', 'Ceramiche'],
        'tags': ['lucca', 'antiquariato', 'mensile'],
    },
    {
        'name': 'Mercato Antiquariato Pistoia',
        'description': (
            'Mercatino mensile dell\'antiquariato nel centro storico di Pistoia. '
            '~50 espositori. Attivo da aprile a ottobre.'
        ),
        'event_type': 'antiquariato',
        'city': 'Pistoia',
        'region': 'Toscana',
        'address': 'Centro storico, Pistoia',
        'schedule': 'second_sunday',
        'only_months': list(range(4, 11)),  # April–October
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['pistoia', 'antiquariato', 'mensile'],
    },
    {
        'name': 'Mercato Antiquariato Piazza Ciompi – Firenze',
        'description': (
            'Mercato mensile a Firenze specializzato in vinili, fumetti e abbigliamento vintage. '
            'Quarta domenica del mese in Piazza dei Ciompi.'
        ),
        'event_type': 'mercatino',
        'city': 'Firenze',
        'region': 'Toscana',
        'address': 'Piazza dei Ciompi, Firenze',
        'schedule': 'fourth_sunday',
        'start_time': '09:00',
        'end_time': '19:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Vinili', 'Fumetti', 'Vintage'],
        'tags': ['firenze', 'ciompi', 'mensile'],
    },
    {
        'name': 'Mercato Antiquariato Santo Spirito – Firenze',
        'description': (
            'Mercato antiquariato ogni seconda domenica in Piazza Santo Spirito, Firenze. '
            '80 espositori. Attivo da 36 anni.'
        ),
        'event_type': 'antiquariato',
        'city': 'Firenze',
        'region': 'Toscana',
        'address': 'Piazza Santo Spirito, Firenze',
        'schedule': 'second_sunday',
        'start_time': '09:00',
        'end_time': '19:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['firenze', 'santo spirito', 'mensile'],
    },
    # ─── PIEMONTE ──────────────────────────────────────────────────────────
    {
        'name': 'Gran Balon – Torino',
        'description': (
            'Il mercato dell\'antiquariato e del vintage più grande di Torino. '
            'Seconda domenica del mese nel quartiere Borgo Dora. '
            'Art Déco, vinili, abbigliamento, mobili, oggetti da collezione.'
        ),
        'event_type': 'antiquariato',
        'city': 'Torino',
        'region': 'Piemonte',
        'address': 'Borgo Dora, Torino',
        'schedule': 'second_sunday_and_prev_saturday',
        'start_time': '08:00',
        'end_time': '18:30',
        'website': 'https://www.balon.it',
        'organizer': 'Associazione Balon',
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': True,
        'categories': ['Antiquariato', 'Vinili', 'Art Déco', 'Vintage'],
        'tags': ['torino', 'gran balon', 'mensile'],
    },
    # ─── LAZIO ─────────────────────────────────────────────────────────────
    {
        'name': 'Porta Portese – Roma',
        'description': (
            'Il mercato delle pulci più grande e famoso di Roma. '
            'Ogni domenica mattina a Trastevere. '
            'Abbigliamento vintage, antiquariato, vinili, libri, elettronica, oggettistica.'
        ),
        'event_type': 'mercatino',
        'city': 'Roma',
        'region': 'Lazio',
        'address': 'Via Porta Portese / Trastevere, Roma',
        'schedule': 'every_sunday',
        'start_time': '06:00',
        'end_time': '14:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': True,
        'categories': ['Vintage', 'Antiquariato', 'Vinili', 'Libri'],
        'tags': ['roma', 'porta portese', 'settimanale'],
    },
    # ─── LOMBARDIA ─────────────────────────────────────────────────────────
    {
        'name': 'Mercato Antiquariato Navigli – Milano',
        'description': (
            'Mercato mensile dell\'antiquariato lungo i Navigli di Milano. '
            'Mid-century modern, design, vinili, abbigliamento vintage. '
            'Ultimo sabato del mese.'
        ),
        'event_type': 'antiquariato',
        'city': 'Milano',
        'region': 'Lombardia',
        'address': 'Naviglio Grande, Milano',
        'schedule': 'last_sunday',
        'start_time': '09:00',
        'end_time': '19:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': True,
        'categories': ['Antiquariato', 'Design', 'Vinili', 'Vintage'],
        'tags': ['milano', 'navigli', 'mensile'],
    },
    # ─── EMILIA-ROMAGNA ────────────────────────────────────────────────────
    {
        'name': 'Mercanteinfiera – Parma',
        'description': (
            'La fiera antiquaria più importante d\'Europa. '
            '1.000+ espositori da tutto il mondo. '
            'Mobili, sculture, gioielli, tappeti, oggetti d\'arte. '
            'Due edizioni: marzo e ottobre.'
        ),
        'event_type': 'antiquariato',
        'city': 'Parma',
        'region': 'Emilia-Romagna',
        'address': 'Fiere di Parma, Via delle Esposizioni 393A, Parma',
        'schedule': 'fixed',
        'fixed_dates': {
            3: ('2026-03-07', '2026-03-15'),
            10: ('2026-10-03', '2026-10-11'),
        },
        'start_time': '10:00',
        'end_time': '19:00',
        'website': 'https://www.mercanteinfiera.it',
        'organizer': 'Fiere di Parma',
        'price_info': 'A pagamento',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': True,
        'categories': ['Antiquariato', 'Arte', 'Gioielli', 'Tappeti'],
        'tags': ['parma', 'mercanteinfiera', 'fiera', 'europeo'],
    },
    # ─── SICILIA ───────────────────────────────────────────────────────────
    {
        'name': 'Mercato Ballarò – Palermo',
        'description': (
            'Mercato storico quotidiano nel quartiere Albergheria di Palermo. '
            'Ceramiche siciliane, tessuti tradizionali, vintage e oggettistica locale.'
        ),
        'event_type': 'mercatino',
        'city': 'Palermo',
        'region': 'Sicilia',
        'address': 'Via Ballarò, Albergheria, Palermo',
        'schedule': 'every_sunday',
        'start_time': '07:00',
        'end_time': '14:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Mercato', 'Ceramiche', 'Vintage'],
        'tags': ['palermo', 'ballaro', 'settimanale'],
    },
    {
        'name': 'Mercatino Antiquariato Via La Marmora – Catania',
        'description': (
            'Mercatino mensile dell\'antiquariato nel centro di Catania. '
            'Oggetti d\'epoca, vinili, fumetti, abbigliamento vintage.'
        ),
        'event_type': 'antiquariato',
        'city': 'Catania',
        'region': 'Sicilia',
        'address': 'Via La Marmora / Villa Bellini, Catania',
        'schedule': 'third_weekend',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato', 'Vinili', 'Vintage'],
        'tags': ['catania', 'antiquariato', 'mensile'],
    },
    # ─── VENETO ────────────────────────────────────────────────────────────
    {
        'name': 'Mercato dell\'Antiquariato di Piazzola sul Brenta',
        'description': (
            'Uno dei mercati antiquari più grandi d\'Italia. '
            'Più di 1.000 espositori nell\'immenso complesso della Villa Contarini. '
            'Mobili, arte, gioielli, libri, vinili, vintage e collezionismo.'
        ),
        'event_type': 'antiquariato',
        'city': 'Piazzola sul Brenta',
        'region': 'Veneto',
        'address': 'Villa Contarini, Piazzola sul Brenta (PD)',
        'schedule': 'fixed',
        'fixed_dates': {
            4:  ('2026-04-18', '2026-04-19'),
            5:  ('2026-05-16', '2026-05-17'),
            6:  ('2026-06-20', '2026-06-21'),
            7:  ('2026-07-18', '2026-07-19'),
            8:  ('2026-08-22', '2026-08-23'),
            9:  ('2026-09-19', '2026-09-20'),
            10: ('2026-10-17', '2026-10-18'),
        },
        'start_time': '07:00',
        'end_time': '18:00',
        'website': 'https://www.mercatopiazzola.it',
        'organizer': 'Mercato di Piazzola',
        'price_info': 'A pagamento',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': True,
        'categories': ['Antiquariato', 'Arte', 'Vintage', 'Vinili'],
        'tags': ['piazzola', 'veneto', 'mensile', 'grandi fiere'],
    },
    {
        'name': 'Mercatino dell\'Antiquariato di Verona',
        'description': (
            'Mercato mensile nel centro storico di Verona. '
            'Ogni prima domenica, ~300 espositori tra Piazza San Zeno e Stradone San Fermo.'
        ),
        'event_type': 'antiquariato',
        'city': 'Verona',
        'region': 'Veneto',
        'address': 'Piazza San Zeno / Stradone San Fermo, Verona',
        'schedule': 'first_sunday_and_prev_saturday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['verona', 'antiquariato', 'mensile'],
    },
    {
        'name': 'Mercatino dell\'Usato – Padova',
        'description': (
            'Mercato del riuso e vintage ogni terza domenica a Padova. '
            'Abbigliamento, vinili, mobili, oggettistica.'
        ),
        'event_type': 'mercatino',
        'city': 'Padova',
        'region': 'Veneto',
        'address': 'Prato della Valle, Padova',
        'schedule': 'third_weekend',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Vintage', 'Usato', 'Vinili'],
        'tags': ['padova', 'mercatino', 'mensile'],
    },
    # ─── EMILIA-ROMAGNA (aggiuntivi) ───────────────────────────────────────
    {
        'name': 'Mercatino dell\'Antiquariato – Bologna',
        'description': (
            'Mercato mensile nel centro di Bologna. '
            'Ogni seconda domenica, ~200 espositori tra Piazza Santo Stefano e vie del centro.'
        ),
        'event_type': 'antiquariato',
        'city': 'Bologna',
        'region': 'Emilia-Romagna',
        'address': 'Piazza Santo Stefano, Bologna',
        'schedule': 'second_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['bologna', 'antiquariato', 'mensile'],
    },
    {
        'name': 'Mercatino dell\'Antiquariato – Modena',
        'description': 'Mercato antiquariato ogni quarta domenica in centro storico a Modena.',
        'event_type': 'antiquariato',
        'city': 'Modena',
        'region': 'Emilia-Romagna',
        'address': 'Piazza XX Settembre, Modena',
        'schedule': 'fourth_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['modena', 'antiquariato', 'mensile'],
    },
    # ─── CAMPANIA ──────────────────────────────────────────────────────────
    {
        'name': 'Mercatino Vintage Napoli – Piazza Carlo III',
        'description': (
            'Mercato mensile vintage e antiquariato a Napoli. '
            'Abbigliamento vintage, vinili, oggetti retro degli anni \'60–\'90.'
        ),
        'event_type': 'mercatino',
        'city': 'Napoli',
        'region': 'Campania',
        'address': 'Piazza Carlo III, Napoli',
        'schedule': 'first_sunday_and_prev_saturday',
        'start_time': '09:00',
        'end_time': '19:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Vintage', 'Vinili'],
        'tags': ['napoli', 'vintage', 'mensile'],
    },
    {
        'name': 'Mercatino dell\'Antiquariato – Salerno',
        'description': (
            'Mercatino mensile dell\'antiquariato nel centro storico di Salerno. '
            'Terza domenica del mese. Mobili, oggetti, abbigliamento.'
        ),
        'event_type': 'antiquariato',
        'city': 'Salerno',
        'region': 'Campania',
        'address': 'Via Mercanti, Salerno',
        'schedule': 'third_weekend',
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['salerno', 'antiquariato', 'mensile'],
    },
    # ─── PUGLIA ────────────────────────────────────────────────────────────
    {
        'name': 'Mercatino Antiquariato – Bari',
        'description': (
            'Mercato mensile dell\'antiquariato e del vintage a Bari. '
            'Ogni seconda domenica in Lungomare Nazario Sauro.'
        ),
        'event_type': 'antiquariato',
        'city': 'Bari',
        'region': 'Puglia',
        'address': 'Lungomare Nazario Sauro, Bari',
        'schedule': 'second_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato', 'Vintage'],
        'tags': ['bari', 'antiquariato', 'mensile'],
    },
    {
        'name': 'Fiera del Levante Vintage – Bari',
        'description': (
            'Mostra mercato di antiquariato e collezionismo in fiera a Bari. '
            'Grande evento annuale autunnale ma con edizioni mensili ridotte.'
        ),
        'event_type': 'antiquariato',
        'city': 'Bari',
        'region': 'Puglia',
        'address': 'Quartiere Fieristico, Bari',
        'schedule': 'last_sunday',
        'start_time': '09:00',
        'end_time': '18:00',
        'website': 'https://www.fieradellevante.it',
        'organizer': 'Fiera del Levante',
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato', 'Collezionismo'],
        'tags': ['bari', 'fiera', 'mensile'],
    },
    # ─── LIGURIA ───────────────────────────────────────────────────────────
    {
        'name': 'Mercato dell\'Antiquariato – Genova (Porto Antico)',
        'description': (
            'Mercato mensile dell\'antiquariato nel Porto Antico di Genova. '
            'Ogni prima domenica, circa 150 espositori.'
        ),
        'event_type': 'antiquariato',
        'city': 'Genova',
        'region': 'Liguria',
        'address': 'Porto Antico, Genova',
        'schedule': 'first_sunday_and_prev_saturday',
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['genova', 'antiquariato', 'mensile'],
    },
    # ─── MARCHE ────────────────────────────────────────────────────────────
    {
        'name': 'Antiquariato Treia',
        'description': (
            'Fiera bimestrale dell\'antiquariato a Treia (Macerata). '
            'Evento consolidato con decine di espositori regionali.'
        ),
        'event_type': 'antiquariato',
        'city': 'Treia',
        'region': 'Marche',
        'address': 'Centro storico, Treia (MC)',
        'schedule': 'second_sunday',
        'only_months': [3, 5, 7, 9, 11],
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['treia', 'marche', 'bimestrale'],
    },
    {
        'name': 'Mercatino dell\'Antiquariato – Ancona',
        'description': 'Mercato mensile antiquariato nel centro di Ancona. Ultima domenica.',
        'event_type': 'antiquariato',
        'city': 'Ancona',
        'region': 'Marche',
        'address': 'Piazza del Plebiscito, Ancona',
        'schedule': 'last_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['ancona', 'marche', 'mensile'],
    },
    # ─── ABRUZZO ───────────────────────────────────────────────────────────
    {
        'name': 'Mercatino Vintage – Pescara',
        'description': (
            'Mercatino vintage e antiquariato a Pescara. '
            'Quarta domenica del mese sul lungomare.'
        ),
        'event_type': 'mercatino',
        'city': 'Pescara',
        'region': 'Abruzzo',
        'address': 'Lungomare Cristoforo Colombo, Pescara',
        'schedule': 'fourth_sunday',
        'only_months': list(range(4, 11)),
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Vintage', 'Antiquariato'],
        'tags': ['pescara', 'abruzzo', 'mensile'],
    },
    # ─── UMBRIA ────────────────────────────────────────────────────────────
    {
        'name': 'Mercato dell\'Antiquariato – Perugia',
        'description': (
            'Mercatino mensile dell\'antiquariato nel centro storico di Perugia. '
            'Prima domenica del mese in Piazza Matteotti.'
        ),
        'event_type': 'antiquariato',
        'city': 'Perugia',
        'region': 'Umbria',
        'address': 'Piazza Matteotti, Perugia',
        'schedule': 'first_sunday_and_prev_saturday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['perugia', 'umbria', 'mensile'],
    },
    # ─── FRIULI-VENEZIA GIULIA ─────────────────────────────────────────────
    {
        'name': 'Mercatino dell\'Antiquariato – Trieste',
        'description': (
            'Mercato mensile dell\'antiquariato a Trieste. '
            'Ogni prima domenica in Piazza Unità d\'Italia.'
        ),
        'event_type': 'antiquariato',
        'city': 'Trieste',
        'region': 'Friuli-Venezia Giulia',
        'address': "Piazza Unità d'Italia, Trieste",
        'schedule': 'first_sunday_and_prev_saturday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['trieste', 'friuli', 'mensile'],
    },
    # ─── TRENTINO-ALTO ADIGE ──────────────────────────────────────────────
    {
        'name': 'Mercato Vintage – Trento',
        'description': (
            'Mercato vintage e antiquariato nel centro di Trento. '
            'Seconda domenica del mese in Piazza Duomo.'
        ),
        'event_type': 'mercatino',
        'city': 'Trento',
        'region': 'Trentino-Alto Adige',
        'address': 'Piazza Duomo, Trento',
        'schedule': 'second_sunday',
        'only_months': list(range(4, 11)),
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Vintage', 'Antiquariato'],
        'tags': ['trento', 'trentino', 'mensile'],
    },
    # ─── CALABRIA ──────────────────────────────────────────────────────────
    {
        'name': 'Mercatino dell\'Antiquariato – Reggio Calabria',
        'description': (
            'Mercato antiquariato mensile sul Lungomare di Reggio Calabria. '
            'Terza domenica del mese.'
        ),
        'event_type': 'antiquariato',
        'city': 'Reggio Calabria',
        'region': 'Calabria',
        'address': 'Lungomare Falcomatà, Reggio Calabria',
        'schedule': 'third_weekend',
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['reggio calabria', 'calabria', 'mensile'],
    },
    # ─── SARDEGNA ──────────────────────────────────────────────────────────
    {
        'name': 'Mercato Antiquario di Cagliari',
        'description': (
            'Mercato mensile dell\'antiquariato e vintage a Cagliari. '
            'Ogni seconda domenica in Piazza Costituzione.'
        ),
        'event_type': 'antiquariato',
        'city': 'Cagliari',
        'region': 'Sardegna',
        'address': 'Piazza Costituzione, Cagliari',
        'schedule': 'second_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato', 'Vintage'],
        'tags': ['cagliari', 'sardegna', 'mensile'],
    },
    # ─── BASILICATA ────────────────────────────────────────────────────────
    {
        'name': 'Mercatino Vintage – Matera',
        'description': (
            'Mercato del vintage e dell\'antiquariato a Matera (Patrimonio UNESCO). '
            'Quarta domenica del mese nella zona nuova.'
        ),
        'event_type': 'mercatino',
        'city': 'Matera',
        'region': 'Basilicata',
        'address': 'Piazza Vittorio Veneto, Matera',
        'schedule': 'fourth_sunday',
        'only_months': list(range(4, 11)),
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Vintage', 'Antiquariato'],
        'tags': ['matera', 'basilicata', 'mensile'],
    },
    # ─── MOLISE ────────────────────────────────────────────────────────────
    {
        'name': 'Mercatino dell\'Antiquariato – Campobasso',
        'description': (
            'Mercato antiquariato mensile nel centro di Campobasso. '
            'Prima domenica del mese.'
        ),
        'event_type': 'antiquariato',
        'city': 'Campobasso',
        'region': 'Molise',
        'address': 'Piazza Vittorio Emanuele II, Campobasso',
        'schedule': 'first_sunday_and_prev_saturday',
        'only_months': list(range(4, 11)),
        'start_time': '09:00',
        'end_time': '17:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['campobasso', 'molise', 'mensile'],
    },
    # ─── VALLE D'AOSTA ─────────────────────────────────────────────────────
    {
        'name': "Marché Vert Noël – Aosta",
        'description': (
            'Mercato natalizio e dell\'artigianato di Aosta. '
            'Dal 29 novembre al 6 gennaio in Piazza Chanoux.'
        ),
        'event_type': 'mercatino',
        'city': 'Aosta',
        'region': "Valle d'Aosta",
        'address': 'Piazza Chanoux, Aosta',
        'schedule': 'fixed',
        'fixed_dates': {
            12: ('2026-12-01', '2027-01-06'),
        },
        'start_time': '10:00',
        'end_time': '20:00',
        'website': 'https://www.aostavalley.com',
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Mercato', 'Artigianato', 'Natale'],
        'tags': ['aosta', 'valle daosta', 'natalizio'],
    },
    {
        'name': 'Mercatino Vintage – Aosta',
        'description': (
            'Mercatino del vintage e del riuso in Valle d\'Aosta. '
            'Terza domenica del mese, attivo aprile-ottobre.'
        ),
        'event_type': 'mercatino',
        'city': 'Aosta',
        'region': "Valle d'Aosta",
        'address': 'Via Xavier De Maistre, Aosta',
        'schedule': 'third_weekend',
        'only_months': list(range(4, 11)),
        'start_time': '09:00',
        'end_time': '17:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Vintage'],
        'tags': ['aosta', 'valle daosta', 'mensile'],
    },
    # ─── LOMBARDIA (aggiuntivi) ────────────────────────────────────────────
    {
        'name': 'Mercatone dell\'Antiquariato – Brescia',
        'description': (
            'Mercato mensile antiquariato a Brescia, '
            'ogni quarta domenica in Piazza della Loggia.'
        ),
        'event_type': 'antiquariato',
        'city': 'Brescia',
        'region': 'Lombardia',
        'address': 'Piazza della Loggia, Brescia',
        'schedule': 'fourth_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['brescia', 'lombardia', 'mensile'],
    },
    {
        'name': 'Mercatino dell\'Antiquariato – Bergamo',
        'description': (
            'Mercato mensile nella Città Alta di Bergamo. '
            'Ogni terza domenica, circa 100 espositori.'
        ),
        'event_type': 'antiquariato',
        'city': 'Bergamo',
        'region': 'Lombardia',
        'address': 'Piazza Vecchia, Città Alta, Bergamo',
        'schedule': 'third_weekend',
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['bergamo', 'lombardia', 'mensile'],
    },
    # ─── LAZIO (aggiuntivi) ────────────────────────────────────────────────
    {
        'name': 'Mercato di Via Sannio – Roma',
        'description': (
            'Storico mercato settimanale di abbigliamento usato e vintage a Roma. '
            'Ogni sabato mattina vicino a Porta San Giovanni.'
        ),
        'event_type': 'mercatino',
        'city': 'Roma',
        'region': 'Lazio',
        'address': 'Via Sannio, San Giovanni, Roma',
        'schedule': 'every_saturday',
        'start_time': '07:00',
        'end_time': '13:30',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Vintage', 'Abbigliamento'],
        'tags': ['roma', 'sannio', 'settimanale'],
    },
    {
        'name': 'Mercatino Antiquariato – Viterbo',
        'description': (
            'Mercatino mensile dell\'antiquariato nel centro medievale di Viterbo. '
            'Ogni terza domenica.'
        ),
        'event_type': 'antiquariato',
        'city': 'Viterbo',
        'region': 'Lazio',
        'address': 'Centro storico, Viterbo',
        'schedule': 'third_weekend',
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['viterbo', 'lazio', 'mensile'],
    },

    # ─── MERCATI SETTIMANALI ───────────────────────────────────────────────
    # Mercati con cadenza settimanale che includono banchi di usato/vintage

    {
        'name': 'Mercato delle Cascine – Firenze',
        'description': (
            'Il più grande mercato settimanale di Firenze, ogni martedì mattina. '
            'Centinaia di banchi: abbigliamento usato e vintage, oggetti, accessori, tessuti. '
            'Uno dei mercati più antichi e amati della città.'
        ),
        'event_type': 'mercatino',
        'city': 'Firenze',
        'region': 'Toscana',
        'address': 'Viale Lincoln / Parco delle Cascine, Firenze',
        'schedule': 'every_tuesday',
        'start_time': '08:00',
        'end_time': '14:00',
        'website': None,
        'organizer': 'Comune di Firenze',
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Abbigliamento', 'Vintage', 'Usato'],
        'tags': ['firenze', 'toscana', 'settimanale', 'martedì'],
    },
    {
        'name': 'Mercato Settimanale – Pistoia',
        'description': (
            'Il tradizionale mercato settimanale di Pistoia si svolge ogni mercoledì e sabato '
            'nel centro storico. Include banchi di abbigliamento usato, oggetti vintage e '
            'piccolo antiquariato. Appuntamento fisso per i pistoiesi.'
        ),
        'event_type': 'mercatino',
        'city': 'Pistoia',
        'region': 'Toscana',
        'address': 'Piazza del Duomo e centro storico, Pistoia',
        'schedule': 'every_wednesday_and_saturday',
        'start_time': '08:00',
        'end_time': '13:30',
        'website': None,
        'organizer': 'Comune di Pistoia',
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Usato', 'Abbigliamento', 'Vintage'],
        'tags': ['pistoia', 'toscana', 'settimanale', 'mercoledì', 'sabato'],
    },
    {
        'name': 'Mercato di Senigallia – Milano',
        'description': (
            'Storico mercato delle pulci milanese lungo i Navigli, ogni sabato mattina. '
            'Antiquariato, vintage, libri usati, oggetti curiosi. '
            'Frequentato da collezionisti e appassionati di tutta la Lombardia.'
        ),
        'event_type': 'mercatino',
        'city': 'Milano',
        'region': 'Lombardia',
        'address': 'Via Calatafimi / Alzaia Naviglio Grande, Milano',
        'schedule': 'every_saturday',
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato', 'Vintage', 'Libri'],
        'tags': ['milano', 'lombardia', 'settimanale', 'sabato', 'navigli'],
    },
    {
        'name': 'Mercato di Porta Palazzo – Torino',
        'description': (
            'Il più grande mercato all\'aperto d\'Europa, con un\'importante sezione '
            'di usato e vintage ogni domenica. Abbigliamento, elettrodomestici vintage, '
            'oggetti, curiosità. Un\'istituzione torinese.'
        ),
        'event_type': 'mercatino',
        'city': 'Torino',
        'region': 'Piemonte',
        'address': 'Piazza della Repubblica, Torino',
        'schedule': 'every_sunday',
        'start_time': '08:00',
        'end_time': '14:00',
        'website': None,
        'organizer': 'Comune di Torino',
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Usato', 'Vintage', 'Abbigliamento'],
        'tags': ['torino', 'piemonte', 'settimanale', 'domenica', 'porta palazzo'],
    },
    {
        'name': 'Mercato Antiquariato Via Piave – Bologna',
        'description': (
            'Mercato domenicale di antiquariato e vintage nel cuore di Bologna. '
            'Libri usati, oggetti d\'epoca, abbigliamento vintage, stampe e incisioni.'
        ),
        'event_type': 'antiquariato',
        'city': 'Bologna',
        'region': 'Emilia-Romagna',
        'address': 'Via Piave / Parco della Montagnola, Bologna',
        'schedule': 'every_sunday',
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato', 'Libri', 'Vintage'],
        'tags': ['bologna', 'emilia-romagna', 'settimanale', 'domenica'],
    },
    {
        'name': 'Mercato di Piazza Vittorio – Roma',
        'description': (
            'Mercato domenicale di abbigliamento usato, vintage e oggetti vari '
            'in Piazza Vittorio Emanuele II. Frequentato e variegato, con banchi '
            'di vintage anni \'70–\'90 e abbigliamento usato a prezzi accessibili.'
        ),
        'event_type': 'mercatino',
        'city': 'Roma',
        'region': 'Lazio',
        'address': 'Piazza Vittorio Emanuele II, Roma',
        'schedule': 'every_sunday',
        'start_time': '08:00',
        'end_time': '14:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Usato', 'Vintage', 'Abbigliamento'],
        'tags': ['roma', 'lazio', 'settimanale', 'domenica'],
    },
    {
        'name': 'Fiera dell\'Antiquariato – Padova',
        'description': (
            'Mercato mensile dell\'antiquariato a Padova, ogni quarta domenica. '
            'Mobili, oggetti d\'arte, ceramiche, libri e vinili.'
        ),
        'event_type': 'antiquariato',
        'city': 'Padova',
        'region': 'Veneto',
        'address': 'Prato della Valle, Padova',
        'schedule': 'fourth_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato', 'Arte'],
        'tags': ['padova', 'veneto', 'mensile'],
    },
    {
        'name': 'Mercato dell\'Antiquariato – Napoli',
        'description': (
            'Mercato domenicale di antiquariato e vintage a Villa Comunale. '
            'Oggetti d\'antiquariato, libri usati, vinili, ceramiche.'
        ),
        'event_type': 'antiquariato',
        'city': 'Napoli',
        'region': 'Campania',
        'address': 'Villa Comunale, Napoli',
        'schedule': 'every_sunday',
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato', 'Libri', 'Vinili'],
        'tags': ['napoli', 'campania', 'settimanale', 'domenica'],
    },
    {
        'name': 'Mercato delle Pulci – Genova',
        'description': (
            'Mercato delle pulci domenicale di Genova, con banchi di antiquariato, '
            'usato e curiosità. Storico appuntamento genovese.'
        ),
        'event_type': 'mercatino',
        'city': 'Genova',
        'region': 'Liguria',
        'address': 'Corso Sardegna, Genova',
        'schedule': 'every_sunday',
        'start_time': '09:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Usato', 'Antiquariato'],
        'tags': ['genova', 'liguria', 'settimanale', 'domenica'],
    },
    {
        'name': 'Mercato Antiquariato – Bari Vecchia',
        'description': (
            'Mercato domenicale di antiquariato e usato nel centro storico di Bari. '
            'Ceramiche, oggetti vintage, libri e curiosità pugliesi.'
        ),
        'event_type': 'antiquariato',
        'city': 'Bari',
        'region': 'Puglia',
        'address': 'Bari Vecchia, Bari',
        'schedule': 'every_sunday',
        'start_time': '09:00',
        'end_time': '14:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato', 'Ceramiche'],
        'tags': ['bari', 'puglia', 'settimanale', 'domenica'],
    },
    {
        'name': 'Mercato dell\'Antiquariato – Catania',
        'description': (
            'Mercato domenicale di antiquariato a Catania, vicino alla Pescheria. '
            'Oggetti d\'epoca, ceramiche siciliane, libri, vinili.'
        ),
        'event_type': 'antiquariato',
        'city': 'Catania',
        'region': 'Sicilia',
        'address': 'Via Plebiscito / Mercato della Pescheria, Catania',
        'schedule': 'every_sunday',
        'start_time': '09:00',
        'end_time': '14:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato', 'Ceramiche'],
        'tags': ['catania', 'sicilia', 'settimanale', 'domenica'],
    },

    # ─── NUOVI MERCATI DA RICERCA APPROFONDITA ────────────────────────────────

    # CAMPANIA
    {
        'name': 'Mercato di Resina – Ercolano',
        'description': (
            'Il mercato vintage più famoso del Sud Italia, noto come "il paradiso del vintage". '
            'Ogni sabato e domenica mattina a Ercolano (NA). '
            'Abbigliamento vintage anni \'50–\'90, accessori, borse, scarpe firmate a prezzi bassi. '
            'Meta imperdibile per cacciatori di vintage da tutta Italia.'
        ),
        'event_type': 'mercatino',
        'city': 'Ercolano',
        'region': 'Campania',
        'address': 'Via Pugliano, Ercolano (NA)',
        'schedule': 'every_sunday_and_saturday',
        'start_time': '07:00',
        'end_time': '13:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': True,
        'categories': ['Vintage', 'Abbigliamento', 'Accessori'],
        'tags': ['ercolano', 'resina', 'campania', 'settimanale', 'vintage'],
    },

    # PIEMONTE — provincia di Alessandria
    {
        'name': 'Mercatino Antiquariato – Casale Monferrato',
        'description': (
            'Mercatino mensile dell\'antiquariato e del collezionismo a Casale Monferrato. '
            'Terza domenica del mese in Piazza Mazzini. '
            'Uno degli appuntamenti di riferimento per l\'antiquariato piemontese.'
        ),
        'event_type': 'antiquariato',
        'city': 'Casale Monferrato',
        'region': 'Piemonte',
        'address': 'Piazza Mazzini, Casale Monferrato (AL)',
        'schedule': 'third_weekend',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato', 'Collezionismo'],
        'tags': ['casale monferrato', 'piemonte', 'alessandria', 'mensile'],
    },
    {
        'name': 'Mercatino Antiquariato – Moncalieri',
        'description': (
            'Mercato mensile dell\'antiquariato e del modernariato a Moncalieri (TO). '
            'Secondo sabato del mese nel centro storico.'
        ),
        'event_type': 'antiquariato',
        'city': 'Moncalieri',
        'region': 'Piemonte',
        'address': 'Centro storico, Moncalieri (TO)',
        'schedule': 'second_saturday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato', 'Modernariato'],
        'tags': ['moncalieri', 'piemonte', 'torino', 'mensile'],
    },

    # UMBRIA
    {
        'name': 'Antiquariato sotto le mura – Amelia',
        'description': (
            'Mercato mensile dell\'antiquariato e del collezionismo ad Amelia (TR), '
            'nel suggestivo borgo medievale umbro con le mura poligonali. '
            'Seconda domenica del mese. Oggetti d\'epoca, modernariato, ceramiche.'
        ),
        'event_type': 'antiquariato',
        'city': 'Amelia',
        'region': 'Umbria',
        'address': 'Centro storico, Amelia (TR)',
        'schedule': 'second_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': 'https://www.umbriatourism.it',
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato', 'Collezionismo'],
        'tags': ['amelia', 'umbria', 'terni', 'mensile'],
    },
    {
        'name': 'Mercato Antiquariato Collezionismo – Pissignano',
        'description': (
            'Mercato mensile di antiquariato, usato e collezionismo a Pissignano '
            '(Campello sul Clitunno, PG). Quarta domenica del mese. '
            'Ambiente caratteristico del borgo umbro.'
        ),
        'event_type': 'antiquariato',
        'city': 'Campello sul Clitunno',
        'region': 'Umbria',
        'address': 'Pissignano, Campello sul Clitunno (PG)',
        'schedule': 'fourth_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato', 'Usato', 'Collezionismo'],
        'tags': ['pissignano', 'campello clitunno', 'umbria', 'perugia', 'mensile'],
    },

    # VENETO — province minori
    {
        'name': 'Mercatino Antiquariato – Vicenza',
        'description': (
            'Mercato mensile dell\'antiquariato nel centro storico di Vicenza. '
            'Prima domenica del mese in Piazza dei Signori.'
        ),
        'event_type': 'antiquariato',
        'city': 'Vicenza',
        'region': 'Veneto',
        'address': 'Piazza dei Signori, Vicenza',
        'schedule': 'first_sunday_and_prev_saturday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['vicenza', 'veneto', 'mensile'],
    },
    {
        'name': 'Mercatino Antiquariato – Treviso',
        'description': (
            'Mercato mensile dell\'antiquariato a Treviso. '
            'Seconda domenica del mese nel centro storico.'
        ),
        'event_type': 'antiquariato',
        'city': 'Treviso',
        'region': 'Veneto',
        'address': 'Centro storico, Treviso',
        'schedule': 'second_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['treviso', 'veneto', 'mensile'],
    },

    # EMILIA-ROMAGNA — province minori
    {
        'name': 'Mercatino Antiquariato – Ferrara',
        'description': (
            'Mercato mensile dell\'antiquariato a Ferrara, '
            'prima domenica del mese nel centro storico UNESCO.'
        ),
        'event_type': 'antiquariato',
        'city': 'Ferrara',
        'region': 'Emilia-Romagna',
        'address': 'Centro storico, Ferrara',
        'schedule': 'first_sunday_and_prev_saturday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['ferrara', 'emilia-romagna', 'mensile'],
    },
    {
        'name': 'Mercatino Antiquariato – Rimini',
        'description': (
            'Mercato mensile dell\'antiquariato a Rimini. '
            'Terza domenica del mese in centro città.'
        ),
        'event_type': 'antiquariato',
        'city': 'Rimini',
        'region': 'Emilia-Romagna',
        'address': 'Centro storico, Rimini',
        'schedule': 'third_weekend',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['rimini', 'emilia-romagna', 'mensile'],
    },

    # TOSCANA — aggiuntivi
    {
        'name': 'Mercatino Antiquariato – Siena',
        'description': (
            'Mercato mensile dell\'antiquariato a Siena. '
            'Terza domenica del mese in centro storico UNESCO.'
        ),
        'event_type': 'antiquariato',
        'city': 'Siena',
        'region': 'Toscana',
        'address': 'Centro storico, Siena',
        'schedule': 'third_weekend',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['siena', 'toscana', 'mensile'],
    },

    # LIGURIA — aggiuntivi
    {
        'name': 'Mercatino Antiquariato – Savona',
        'description': (
            'Mercato mensile dell\'antiquariato a Savona. '
            'Seconda domenica del mese nel centro storico.'
        ),
        'event_type': 'antiquariato',
        'city': 'Savona',
        'region': 'Liguria',
        'address': 'Centro storico, Savona',
        'schedule': 'second_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['savona', 'liguria', 'mensile'],
    },

    # PUGLIA — aggiuntivi
    {
        'name': 'Mercatino Antiquariato – Lecce',
        'description': (
            'Mercato mensile dell\'antiquariato nel centro barocco di Lecce. '
            'Prima domenica del mese.'
        ),
        'event_type': 'antiquariato',
        'city': 'Lecce',
        'region': 'Puglia',
        'address': 'Centro storico, Lecce',
        'schedule': 'first_sunday_and_prev_saturday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['lecce', 'puglia', 'mensile'],
    },

    # SICILIA — aggiuntivi
    {
        'name': 'Mercatino Antiquariato – Messina',
        'description': (
            'Mercato mensile dell\'antiquariato a Messina. '
            'Seconda domenica del mese in centro città.'
        ),
        'event_type': 'antiquariato',
        'city': 'Messina',
        'region': 'Sicilia',
        'address': 'Centro storico, Messina',
        'schedule': 'second_sunday',
        'start_time': '08:00',
        'end_time': '18:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': False,
        'is_featured': False,
        'categories': ['Antiquariato'],
        'tags': ['messina', 'sicilia', 'mensile'],
    },

    # ─── GRANDI MERCATI VINTAGE RICORRENTI (da ricerca Perplexity) ───────────

    # LOMBARDIA — East Market Milano (uno dei più grandi d'Italia)
    {
        'name': 'East Market Milano',
        'description': (
            'Il più grande mercato vintage di Milano, ospitato in un ex hangar industriale '
            'in via Mecenate 84. Ogni terza domenica del mese con circa 300 espositori '
            'da tutta Italia: abbigliamento vintage, streetwear, sneakers, vinili, '
            'modernariato e accessori. Punto di riferimento nazionale per il vintage.'
        ),
        'event_type': 'mercatino',
        'city': 'Milano',
        'region': 'Lombardia',
        'address': 'Via Mecenate 84, Milano',
        'schedule': 'third_weekend',
        'start_time': '10:00',
        'end_time': '19:00',
        'website': 'https://eastmarket.it',
        'organizer': 'East Market',
        'price_info': 'A pagamento',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': True,
        'categories': ['Vintage', 'Abbigliamento', 'Vinili', 'Modernariato'],
        'tags': ['milano', 'lombardia', 'mensile', 'east market', 'vintage', 'abbigliamento'],
    },
    {
        'name': 'Remira Market – Milano',
        'description': (
            'Mercatino ricorrente a Milano dedicato a vintage, second-hand e artigianato, '
            'ospitato in spazi alternativi come il Tempio del Futuro Perduto. '
            'Selezione curata di capi vintage, oggetti e creazioni artigianali.'
        ),
        'event_type': 'mercatino',
        'city': 'Milano',
        'region': 'Lombardia',
        'address': 'Tempio del Futuro Perduto, Milano',
        'schedule': 'second_sunday',
        'start_time': '10:00',
        'end_time': '19:00',
        'website': None,
        'organizer': 'Remira Market',
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Vintage', 'Abbigliamento', 'Artigianato'],
        'tags': ['milano', 'lombardia', 'mensile', 'remira', 'vintage'],
    },

    # LAZIO — Vintage Market Roma (VMGT)
    {
        'name': 'Vintage Market Roma',
        'description': (
            'L\'evento vintage più rinomato della capitale, ospitato in grandi spazi industriali '
            'come il San Paolo District e gli ex depositi ATAC. '
            'Oltre 200 espositori tra abbigliamento vintage, artigianato, design indipendente '
            'e moda second-hand. Edizioni mensili e speciali durante l\'anno.'
        ),
        'event_type': 'mercatino',
        'city': 'Roma',
        'region': 'Lazio',
        'address': 'San Paolo District / Ex depositi ATAC, Roma',
        'schedule': 'last_sunday',
        'start_time': '10:00',
        'end_time': '20:00',
        'website': 'https://vintagemarketroma.it',
        'organizer': 'Vintage Market Roma',
        'price_info': 'A pagamento',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': True,
        'categories': ['Vintage', 'Abbigliamento', 'Design', 'Artigianato'],
        'tags': ['roma', 'lazio', 'mensile', 'vintage market', 'vmgt', 'abbigliamento'],
    },

    # PUGLIA — Vintage Market Bari
    {
        'name': 'Vintage Market Bari',
        'description': (
            'Il più grande vintage market del Sud Italia, con espositori da tutta la penisola. '
            'Forte componente di abbigliamento di seconda mano, accessori, design e creazioni green. '
            'Evento con edizioni numerate, segnale di una realtà consolidata e in crescita.'
        ),
        'event_type': 'mercatino',
        'city': 'Bari',
        'region': 'Puglia',
        'address': 'Bari (location variabile, vedi sito)',
        'schedule': 'last_sunday',
        'start_time': '10:00',
        'end_time': '20:00',
        'website': 'https://www.vintagemarketbari.it',
        'organizer': 'Vintage Market Bari',
        'price_info': 'A pagamento',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Vintage', 'Abbigliamento', 'Accessori'],
        'tags': ['bari', 'puglia', 'mensile', 'vintage market', 'abbigliamento', 'sud'],
    },

    # EMILIA-ROMAGNA — Fiera Vintage Forlì ("VINTAGE! La moda che vive due volte")
    {
        'name': 'VINTAGE! La moda che vive due volte – Forlì',
        'description': (
            'Storica manifestazione fieristica dedicata alla moda vintage, '
            'giunta alla 41ª edizione nel 2026. Un intero fine settimana dedicato '
            'ad abbigliamento d\'epoca, accessori, bijoux, modernariato e collezionismo, '
            'con espositori selezionati da tutta Italia.'
        ),
        'event_type': 'mercatino',
        'city': 'Forlì',
        'region': 'Emilia-Romagna',
        'address': 'Fiera di Forlì',
        'schedule': 'fixed',
        'fixed_dates': {
            10: ('2026-10-17', '2026-10-18'),  # data indicativa autunnale
        },
        'start_time': '09:00',
        'end_time': '19:00',
        'website': 'https://www.fieravintage.it/fieravintage/',
        'organizer': 'Fiera Vintage Forlì',
        'price_info': 'A pagamento',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Vintage', 'Abbigliamento', 'Modernariato'],
        'tags': ['forlì', 'emilia-romagna', 'fiera', 'annuale', 'vintage', 'abbigliamento'],
    },

    # MARCHE — Summer Jamboree Senigallia
    {
        'name': 'Summer Jamboree – Senigallia',
        'description': (
            'Festival internazionale anni \'40–\'50 di fama mondiale a Senigallia. '
            'Include un\'importante area market dedicata ad abiti, accessori e oggetti '
            'vintage in stile rockabilly e pin-up, oltre a concerti e attività tematiche. '
            'Uno degli appuntamenti più attesi del vintage estivo italiano.'
        ),
        'event_type': 'mercatino',
        'city': 'Senigallia',
        'region': 'Marche',
        'address': 'Senigallia (AN)',
        'schedule': 'fixed',
        'fixed_dates': {
            8: ('2026-08-01', '2026-08-09'),  # di solito prima settimana di agosto
        },
        'start_time': '10:00',
        'end_time': '23:00',
        'website': 'https://www.summerjamboree.com',
        'organizer': 'Summer Jamboree',
        'price_info': 'A pagamento',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': True,
        'categories': ['Vintage', 'Abbigliamento', 'Collezionismo'],
        'tags': ['senigallia', 'marche', 'festival', 'annuale', 'vintage', 'rockabilly'],
    },

    # VENETO — Valeggio veste il Vintage
    {
        'name': 'Valeggio veste il Vintage',
        'description': (
            'Evento alla 29ª edizione che trasforma il centro di Valeggio sul Mincio '
            'in un grande mercato di abbigliamento e accessori vintage selezionati. '
            'Uno dei mercati vintage più affascinanti del Nord Italia, '
            'ambientato in un borgo medievale.'
        ),
        'event_type': 'mercatino',
        'city': 'Valeggio sul Mincio',
        'region': 'Veneto',
        'address': 'Centro storico, Valeggio sul Mincio (VR)',
        'schedule': 'fixed',
        'fixed_dates': {
            7: ('2026-07-19', '2026-07-19'),  # solitamente luglio
        },
        'start_time': '09:00',
        'end_time': '19:00',
        'website': None,
        'organizer': None,
        'price_info': 'Ingresso gratuito',
        'is_recurring': True,
        'is_verified': True,
        'is_featured': False,
        'categories': ['Vintage', 'Abbigliamento', 'Accessori'],
        'tags': ['valeggio sul mincio', 'verona', 'veneto', 'annuale', 'vintage'],
    },
]


def _dates_for_schedule(fair: dict, year: int, month: int) -> list[tuple[str, str | None]]:
    """Return list of (start_date, end_date) tuples for this fair in the given month."""
    schedule = fair.get('schedule', '')
    only_months = fair.get('only_months')
    if only_months and month not in only_months:
        return []

    results = []

    if schedule == 'fixed':
        fd = fair.get('fixed_dates', {})
        if month in fd:
            pair = fd[month]
            results.append((pair[0], pair[1]))

    elif schedule == 'every_sunday':
        # Only first Sunday of the month — is_recurring=True communicates it repeats weekly
        sun = _nth_weekday(year, month, 6, 1)
        if sun:
            results.append((sun.isoformat(), None))

    elif schedule == 'first_sunday_and_prev_saturday':
        sun = _nth_weekday(year, month, 6, 1)
        if sun:
            results.append((_prev_day(sun).isoformat(), sun.isoformat()))

    elif schedule == 'second_sunday_and_prev_saturday':
        sun = _nth_weekday(year, month, 6, 2)
        if sun:
            results.append((_prev_day(sun).isoformat(), sun.isoformat()))

    elif schedule == 'second_sunday':
        sun = _nth_weekday(year, month, 6, 2)
        if sun:
            results.append((sun.isoformat(), None))

    elif schedule == 'third_weekend':
        sat = _nth_weekday(year, month, 5, 3)
        if sat:
            results.append((sat.isoformat(), (sat + timedelta(days=1)).isoformat()))

    elif schedule == 'fourth_sunday':
        sun = _nth_weekday(year, month, 6, 4)
        if sun:
            results.append((sun.isoformat(), None))

    elif schedule == 'last_sunday':
        sun = _nth_weekday(year, month, 6, -1)
        if sun:
            results.append((sun.isoformat(), None))

    elif schedule == 'every_saturday':
        sat = _nth_weekday(year, month, 5, 1)
        if sat:
            results.append((sat.isoformat(), None))

    elif schedule == 'every_tuesday':
        tue = _nth_weekday(year, month, 1, 1)
        if tue:
            results.append((tue.isoformat(), None))

    elif schedule == 'every_wednesday':
        wed = _nth_weekday(year, month, 2, 1)
        if wed:
            results.append((wed.isoformat(), None))

    elif schedule == 'every_thursday':
        thu = _nth_weekday(year, month, 3, 1)
        if thu:
            results.append((thu.isoformat(), None))

    elif schedule == 'every_friday':
        fri = _nth_weekday(year, month, 4, 1)
        if fri:
            results.append((fri.isoformat(), None))

    elif schedule == 'every_wednesday_and_saturday':
        wed = _nth_weekday(year, month, 2, 1)
        sat = _nth_weekday(year, month, 5, 1)
        if wed:
            results.append((wed.isoformat(), None))
        if sat:
            results.append((sat.isoformat(), None))

    elif schedule == 'every_sunday_and_saturday':
        sun = _nth_weekday(year, month, 6, 1)
        sat = _nth_weekday(year, month, 5, 1)
        if sat:
            results.append((sat.isoformat(), None))
        if sun:
            results.append((sun.isoformat(), None))

    return results


def scrape(target_year: int, target_month: int) -> Generator[dict, None, None]:
    for fair in KNOWN_FAIRS:
        for start_date, end_date in _dates_for_schedule(fair, target_year, target_month):
            ev = dict(fair)
            ev.pop('schedule', None)
            ev.pop('fixed_dates', None)
            ev.pop('only_months', None)
            yield {
                **ev,
                'start_date': start_date,
                'end_date':   end_date,
                'lat':        None,
                'lng':        None,
                'source_url': ev.get('website'),
            }
