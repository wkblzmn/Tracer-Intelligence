"""
location_map.py  —  Tracer Intelligence

Two rollups from the free-text `location` field:
  1. map_district()  -> strict official 64-district assignment (for the map)
  2. hub_for()       -> analytical industrial/economic cluster (separate section)

Neighborhoods, upazilas, EPZs and spelling variants roll up to the parent
district. National-scope and overseas buckets are NOT districts and return
special sentinels so they can be excluded from the geographic map honestly.
"""

NATIONAL = "__NATIONAL__"   # "Anywhere in Bangladesh" etc. — real but not a place
OVERSEAS = "__OVERSEAS__"   # Saudi Arabia etc.
UNKNOWN  = "__UNKNOWN__"    # N/A, blank

# ---- national / overseas / junk buckets ----
NATIONAL_KEYS = {
    "anywhere in bangladesh", "all over bangladesh", "anywhere in dhaka division",
    "nationwide", "remote", "work from home", "anywhere",
}
OVERSEAS_KEYS = {
    "saudi arabia", "uae", "united arab emirates", "qatar", "malaysia", "oman",
    "kuwait", "dubai", "abroad", "bahrain", "singapore", "maldives",
}
UNKNOWN_KEYS = {"n/a", "na", "", "-", "tba"}

# ---- neighborhood / upazila / variant  ->  official district ----
# (keys are lowercased; matching is case-insensitive)
TO_DISTRICT = {}

def _add(district, names):
    for n in names:
        TO_DISTRICT[n.lower()] = district

_add("Dhaka", [
    "Dhaka", "Dhaka Sadar", "Banani", "Uttara", "Gulshan", "Gulshan 1", "Gulshan 2",
    "Dhanmondi", "Dhanmondi 27", "Mirpur", "Mirpur 1", "Mirpur 2", "Mirpur 10", "Mirpur 11",
    "Mohammadpur", "Badda", "Motijheel", "Tejgaon", "Tejgaon Industrial Area", "Mohakhali",
    "DOHS Baridhara", "DOHS Mohakhali", "DOHS Mirpur", "DOHS Banani", "Vatara", "Basundhara RA",
    "Nikunja", "Baridhara", "Baridhara J Block", "Purana Paltan", "Naya Paltan", "Paltan",
    "PanthaPath", "Khilkhet", "Aftabnagar", "Banasree", "Shyamoli", "Kawran Bazar", "Farmgate",
    "Hatirpool", "Moghbazaar", "Adabor", "Banglamotor", "Rampura", "Shantinagar", "Lalmatia",
    "Malibagh", "ECB Chottor", "Khilgaon", "Shewrapara", "Kafrul", "Kakrail", "Bashabo",
    "Jatrabari", "Wari", "Kamrangirchar", "Hazaribagh", "Lalbagh", "Kotwali", "Gendaria",
    "Savar", "Ashulia", "Savar EPZ", "Dhamrai", "Keraniganj", "Nawabganj", "Dohar",
    "Uttara Sector 1", "Uttara Sector 3", "Uttara Sector 4", "Uttara Sector 6", "Uttara Sector 7",
    "Uttara Sector 10", "Uttara Sector 11", "Uttara Sector 12", "Uttara Sector 13", "Uttara Sector 15",
    "Shantinagar", "Segunbagicha", "Bijoynagar", "Bangla Motor",
    "Green Road", "Elephant Road", "Old Dhaka", "Kuril", "Demra", "Kalabagan", "Niketan",
    "Mirpur Section 11", "Mirpur 11", "Mirpur 12", "Mirpur12", "Mirpur 14", "Shonir Akhra",
    "Nikunjo", "Uttara West", "Uttara Sector 9", "Uttara Sector 14", "Dhaka GPO", "Mohakhali DOHS",
    "Siddheswari", "Kalabagan", "South Keraniganj", "North Keraniganj",
    "Uttara Sector 2", "Uttara Sector 5", "Uttara Sector 8", "Gulshan Circle 1", "Gulshan Circle 2",
    "Karwan Bazar", "New Market", "Azimpur", "Shahbagh", "Science Lab",
    "Pallabi", "Uttara Model Town", "Merul Badda", "Ashkona", "Maghbazar", "Shaymoli",
    "Bosila", "Mirpur 6", "Basabo", "Shyampur", "Bimanbandar", "Dhanmondi 32", "Amin Bazar",
    "Cantonment", "Turag", "Nadda", "Sadarghat", "Shampur", "Kuril Bishwa Road",
    "Rupnagar", "Pallabi Mirpur", "Matuail", "Sabujbagh", "Dakshinkhan", "Uttarkhan",
    "Agargaon", "Kazipara", "Jigatola", "Mugda", "Kallyanpur", "Bangsal", "Luxmibazar",
    "Eskaton", "Uttar Khan", "Shahjalal Airport", "Mirpur 13", "Mirpur DOHS", "Nikunjo",
    "Rupnagar", "Kamalapur", "Postogola", "Jurain", "Gabtoli", "Mohakhali DOHS",
])
_add("Gazipur", [
    "Gazipur", "Gazipur Sadar", "Tongi", "Kaliakair", "Sreepur", "Sripur", "Kashimpur",
    "Kaliganj", "Sadar Gazipur", "Board Bazar", "Chandra",
])
_add("Narayanganj", [
    "Narayanganj", "Narayanganj Sadar", "Siddirganj", "Rupganj", "Sonargaon", "Bandar",
    "Araihazar", "Fatullah",
])
_add("Munshiganj", ["Munshiganj", "Gazaria", "Sreenagar", "Sirajdikhan", "Louhajang"])
_add("Cox's Bazar", ["Cox's Bazar", "Cox`s Bazar", "Coxs Bazar", "Teknaf", "Ukhia", "Chakaria", "Ramu"])
_add("Chattogram", [
    "Chattogram", "Chittagong", "Chattogram Sadar", "Chattogram EPZ", "Mirsharai", "Patiya",
    "Hathazari", "Sitakunda", "Sitakundo", "Anwara", "Fatikchhari", "Agrabad", "Pahartali", "Halishahar",
])
_add("Mymensingh", ["Mymensingh", "Mymensingh Sadar", "Bhaluka", "Trishal", "Muktagacha", "Gaffargaon"])
_add("Tangail", ["Tangail", "Mirzapur", "Kalihati", "Ghatail", "Sakhipur"])
_add("Manikganj", ["Manikganj", "Singair", "Saturia", "Shibalaya"])
_add("Narsingdi", ["Narsingdi", "Madhabdi", "Palash", "Ghorashal"])
_add("Kishoreganj", ["Kishoreganj", "Bajitpur", "Bhairab", "Kuliarchar"])
_add("Rangpur", ["Rangpur", "Rangpur Sadar", "Pirganj", "Badarganj", "Mithapukur"])
_add("Nilphamari", ["Nilphamari", "Saidpur", "Uttara EPZ", "Uttara EPZ (Nilphamari)", "Domar"])
_add("Dinajpur", ["Dinajpur", "Parbatipur", "Birampur"])
_add("Khulna", ["Khulna", "Khulna Sadar", "Daulatpur", "Khalishpur", "Sonadanga"])
_add("Jashore", ["Jashore", "Jessore", "Abhaynagar", "Noapara"])
_add("Sylhet", ["Sylhet", "Sylhet Sadar", "Beanibazar", "Sreemangal", "Srimangal"])
_add("Rajshahi", ["Rajshahi", "Rajshahi Sadar", "Boalia", "Motihar"])
_add("Bogura", ["Bogura", "Bogura Sadar", "Bogra", "Shibganj", "Shajahanpur"])
_add("Cumilla", ["Cumilla", "Comilla", "Cumilla Adarsha Sadar", "Daudkandi", "Chandina", "Laksam"])
_add("Barishal", ["Barishal", "Barisal", "Barishal Sadar", "Bakerganj"])
_add("Sirajganj", ["Sirajganj", "Shahjadpur", "Ullapara", "Belkuchi"])
_add("Feni", ["Feni", "Feni Sadar", "Chhagalnaiya"])
_add("Noakhali", ["Noakhali", "Hatiya", "Begumganj", "Chatkhil", "Chaumuhani"])
_add("Lakshmipur", ["Lakshmipur", "Raipur", "Ramganj"])
_add("Sherpur", ["Sherpur", "Sherpur Sadar", "Nakla", "Nalitabari"])
_add("Pabna", ["Pabna", "Ishwardi", "Pabna Sadar"])
_add("Jamalpur", ["Jamalpur", "Sarishabari", "Melandaha"])
_add("Faridpur", ["Faridpur", "Bhanga", "Boalmari"])
_add("Kushtia", ["Kushtia", "Kumarkhali", "Bheramara"])


_add("Habiganj", ["Habiganj", "Habiganj Sadar", "Madhabpur", "Nabiganj"])
_add("Gaibandha", ["Gaibandha", "Gaibandha Sadar", "Gobindaganj"])
_add("Shariatpur", ["Shariatpur", "Shariatpur Sadar", "Naria"])
_add("Satkhira", ["Satkhira", "Satkhira Sadar", "Kalaroa"])
_add("Kushtia", ["Kushtia Sadar"])
_add("Bagerhat", ["Bagerhat", "Bagerhat Sadar", "Mongla"])
_add("Narail", ["Narail", "Narail Sadar"])
_add("Netrokona", ["Netrokona", "Netrokona Sadar"])
_add("Rangamati", ["Rangamati", "Rangamati Sadar"])
_add("Chuadanga", ["Chuadanga", "Chuadanga Sadar"])
_add("Magura", ["Magura", "Magura Sadar"])
_add("Meherpur", ["Meherpur", "Meherpur Sadar"])
_add("Naogaon", ["Naogaon", "Naogaon Sadar"])
_add("Natore", ["Natore", "Natore Sadar"])
_add("Chapainawabganj", ["Chapainawabganj", "Chapai Nawabganj"])
_add("Joypurhat", ["Joypurhat"])
_add("Thakurgaon", ["Thakurgaon", "Thakurgaon Sadar"])
_add("Panchagarh", ["Panchagarh"])
_add("Lalmonirhat", ["Lalmonirhat"])
_add("Kurigram", ["Kurigram"])
_add("Bhola", ["Bhola", "Bhola Sadar"])
_add("Patuakhali", ["Patuakhali", "Kuakata"])
_add("Pirojpur", ["Pirojpur"])
_add("Jhalokati", ["Jhalokati"])
_add("Barguna", ["Barguna"])
_add("Gopalganj", ["Gopalganj", "Gopalganj Sadar"])
_add("Madaripur", ["Madaripur"])
_add("Rajbari", ["Rajbari"])
_add("Chandpur", ["Chandpur", "Chandpur Sadar", "Hajiganj"])
_add("Brahmanbaria", ["Brahmanbaria", "Brahmanbaria Sadar", "Ashuganj"])
_add("Khagrachhari", ["Khagrachhari", "Khagrachari"])
_add("Bandarban", ["Bandarban"])
_add("Moulvibazar", ["Moulvibazar", "Sreemangal", "Srimangal", "Kulaura"])
_add("Sunamganj", ["Sunamganj", "Sunamganj Sadar"])
_add("Jhenaidah", ["Jhenaidah", "Jhenaidah Sadar"])
_add("Gazipur", ["Sreepur Gazipur"])
_add("Cumilla", ["Cumilla EPZ"])
_add("Narayanganj", ["Adamjee EPZ"])
_add("Cox's Bazar", ["Cox's Bazar Sadar"])
_add("Narsingdi", ["Narsingdi Sadar"])
_add("Jashore", ["Jashore Sadar"])

_add("Chattogram", ["Khulshi", "Banshkhali", "Chandanaish", "Karnaphuli", "Chittagong Sadar", "Chawkbazar", "Bakalia", "Panchlaish", "Kotwali Chattogram"])
# ---- analytical industrial/economic hubs (deliberately NOT the district lines) ----
HUBS = {
    "Savar–Ashulia RMG Belt": ["savar", "ashulia", "savar epz", "dhamrai"],
    "Gazipur Industrial Corridor": ["gazipur", "gazipur sadar", "tongi", "kaliakair", "sreepur", "sripur", "kashimpur", "chandra", "board bazar", "bhaluka"],
    "Narayanganj Textile Hub": ["narayanganj", "narayanganj sadar", "siddirganj", "rupganj", "fatullah", "sonargaon", "adamjee epz"],
    "Chattogram Port & EPZ": ["chattogram epz", "chattogram sadar", "sitakunda", "sitakundo", "mirsharai", "agrabad", "halishabar", "halishahar", "pahartali"],
    "Dhaka Corporate Core": ["motijheel", "gulshan", "gulshan 1", "gulshan 2", "banani", "tejgaon", "kawran bazar", "dilkusha", "purana paltan"],
}
_HUB_LOOKUP = {}
for hub, keys in HUBS.items():
    for k in keys:
        _HUB_LOOKUP.setdefault(k, hub)  # first hub wins on overlap


def _norm(loc):
    return " ".join((loc or "").strip().split())


def _first_token(loc):
    # multi-location strings like "Chattogram, Dhaka" -> primary
    return loc.split(",")[0].strip() if "," in loc else loc


def map_district(location):
    """Return official district name, or a NATIONAL/OVERSEAS/UNKNOWN sentinel."""
    loc = _norm(location)
    low = loc.lower()
    if low in UNKNOWN_KEYS:
        return UNKNOWN
    if low in NATIONAL_KEYS:
        return NATIONAL
    if low in OVERSEAS_KEYS:
        return OVERSEAS
    if low in TO_DISTRICT:
        return TO_DISTRICT[low]
    # try primary token of a multi-location string
    if "," in loc:
        first = _first_token(loc).lower()
        if first in NATIONAL_KEYS: return NATIONAL
        if first in OVERSEAS_KEYS: return OVERSEAS
        if first in TO_DISTRICT:   return TO_DISTRICT[first]
    # structural fallback: "<X> Sadar" is the seat of district X
    if low.endswith(" sadar"):
        base = low[:-6].strip()
        if base in TO_DISTRICT:
            return TO_DISTRICT[base]
        # title-case the base and check district set directly
        cand = base.title()
        if cand in set(TO_DISTRICT.values()):
            return cand
    return None  # unmapped -> surfaces for review


def hub_for(location):
    """Return analytical hub name, or None."""
    loc = _norm(location).lower()
    if loc in _HUB_LOOKUP:
        return _HUB_LOOKUP[loc]
    if "," in loc:
        first = _first_token(loc)
        if first in _HUB_LOOKUP:
            return _HUB_LOOKUP[first]
    return None