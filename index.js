/* global ngapp, xelib, registerPatcher */

const levelShifts = {
    'Elven': -7,
    'Dwarven': -6,
    'Orcish': 13
};

let fixLevel = function(entry, material) {
    let level = xelib.GetValue(entry, 'LVLO\\Level'),
        shift = levelShifts[material];
    if (level === 25) shift--;
    if (level === 11) shift++;
    xelib.SetValue(entry, 'LVLO\\Level', level);
};

let getMaterialEntry = function(equipment, name) {
    for (let material of Object.keys(equipment)) {
        let entry = equipment[material].find(e => e === name);
        if (entry) return material;
    }
};

let getMaterial = function(rec) {
    let keywords = xelib.GetElements(rec, 'KWDA').map(e => xelib.GetValue(e));
    for (let keyword of keywords) {
        let match = keyword.match(/(Armor|Weap)Material(.*)/);
        if (match) return match[2];
    }
};

let addEquipment = function(equipment, rec) {
    let material = getMaterial(rec);
    if (!targetMaterials.includes(material)) return;
    if (!equipment.hasOwnProperty(material)) equipment[material] = [];
    equipment[material].push(xelib.Name(rec));
};

registerPatcher({
    info: info,
    gameModes: [xelib.gmTES5, xelib.gmSSE],
    settings: {
        label: 'WAFR Patcher',
        templateUrl: `${patcherPath}/partials/settings.html`,
        defaultSettings: {}
    },
    requiredFiles: [],
    getFilesToPatch: function(filenames) {
        return filenames.subtract([
            'Skyrim.esm', 
            'Update.esm', 
            'Dawnguard.esm', 
            'HearthFires.esm', 
            'Dragonborn.esm',
            'Weapon AF.esp',
            'Weapon & Armor Fixes_Remade.esp'
        ]);
    },
    execute: {
        initialize: function(patch, helpers, settings, locals) {
            let equipment = helpers.loadRecords('WEAP,ARMO');
            locals.equipment = {};
            equipment.forEach(function(rec) {
                if (!xelib.IsOverride(rec)) return;
                addEquipment(locals.equipment, rec);
            });
        },
        process: [{
            load: function(plugin, helpers, settings, locals) {
                return { signature: 'LVLI' }
            },
            patch: function(record, helpers, settings, locals) {
                let entries = xelib.GetElements(record, 'Leveled List Entries');
                entries.forEach(entry => {
                    let item = xelib.GetValue(entry, 'LVLO\\Reference'),
                        material = getMaterialEntry(locals.equipment, item);
                    if (!material) return;
                    fixLevel(entry, material);
                });
            }
        }]
    }
});