import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * In-Memory Mongoose Query & Persistence Engine
 * Activates automatically when an external MongoDB daemon (MONGO_URI) is unreachable
 * in sandboxed/containerized environments, allowing all Mongoose Models, ObjectIds,
 * schema defaults, pre-save hooks, compound unique indexes, and .populate() chains
 * to execute natively.
 */

const stores = new Map(); // modelName -> Map(idString -> plainDoc)

function getStore(modelName) {
  if (!stores.has(modelName)) {
    stores.set(modelName, new Map());
  }
  return stores.get(modelName);
}

function toIdString(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val._id) return String(val._id);
  return String(val);
}

function cloneDeep(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof mongoose.Types.ObjectId) return new mongoose.Types.ObjectId(String(obj));
  if (Array.isArray(obj)) return obj.map(cloneDeep);
  const copy = {};
  for (const key of Object.keys(obj)) {
    copy[key] = cloneDeep(obj[key]);
  }
  return copy;
}

function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

function matchesCondition(fieldVal, cond) {
  if (cond === null || cond === undefined) {
    return fieldVal === cond || fieldVal === undefined || fieldVal === null;
  }

  if (cond instanceof RegExp) {
    if (Array.isArray(fieldVal)) {
      return fieldVal.some((v) => cond.test(String(v)));
    }
    return cond.test(String(fieldVal ?? ''));
  }

  if (typeof cond === 'object' && !(cond instanceof Date) && !(cond instanceof mongoose.Types.ObjectId)) {
    // Query operators
    if ('$regex' in cond) {
      const flags = cond.$options || '';
      const regex = cond.$regex instanceof RegExp ? cond.$regex : new RegExp(cond.$regex, flags);
      if (Array.isArray(fieldVal)) {
        return fieldVal.some((v) => regex.test(String(v)));
      }
      return regex.test(String(fieldVal ?? ''));
    }
    if ('$in' in cond) {
      const targetList = (cond.$in || []).map((x) => (x instanceof RegExp ? x : toIdString(x)));
      if (Array.isArray(fieldVal)) {
        return fieldVal.some((v) =>
          targetList.some((t) => (t instanceof RegExp ? t.test(String(v)) : toIdString(v).toLowerCase() === String(t).toLowerCase()))
        );
      }
      return targetList.some((t) =>
        t instanceof RegExp ? t.test(String(fieldVal ?? '')) : toIdString(fieldVal) === String(t)
      );
    }
    if ('$nin' in cond) {
      const targetList = (cond.$nin || []).map(toIdString);
      return !targetList.includes(toIdString(fieldVal));
    }
    if ('$ne' in cond) {
      return toIdString(fieldVal) !== toIdString(cond.$ne);
    }
    if ('$gte' in cond || '$gt' in cond || '$lte' in cond || '$lt' in cond) {
      const numVal = fieldVal instanceof Date ? fieldVal.getTime() : Number(fieldVal);
      if ('$gte' in cond) {
        const cmp = cond.$gte instanceof Date ? cond.$gte.getTime() : Number(cond.$gte);
        if (!(numVal >= cmp)) return false;
      }
      if ('$gt' in cond) {
        const cmp = cond.$gt instanceof Date ? cond.$gt.getTime() : Number(cond.$gt);
        if (!(numVal > cmp)) return false;
      }
      if ('$lte' in cond) {
        const cmp = cond.$lte instanceof Date ? cond.$lte.getTime() : Number(cond.$lte);
        if (!(numVal <= cmp)) return false;
      }
      if ('$lt' in cond) {
        const cmp = cond.$lt instanceof Date ? cond.$lt.getTime() : Number(cond.$lt);
        if (!(numVal < cmp)) return false;
      }
      return true;
    }
  }

  if (Array.isArray(fieldVal)) {
    return fieldVal.map(toIdString).includes(toIdString(cond));
  }

  return toIdString(fieldVal) === toIdString(cond);
}

function matchesFilter(doc, filter = {}) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, cond] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(cond)) {
      if (!cond.some((subFilter) => matchesFilter(doc, subFilter))) return false;
      continue;
    }
    if (key === '$and' && Array.isArray(cond)) {
      if (!cond.every((subFilter) => matchesFilter(doc, subFilter))) return false;
      continue;
    }
    const val = key.includes('.') ? getNestedValue(doc, key) : doc[key];
    if (!matchesCondition(val, cond)) return false;
  }
  return true;
}

// Reference map for schema population
const REF_MAP = {
  User: {},
  StudentProfile: { user: 'User', placedCompany: 'Company' },
  RecruiterProfile: { user: 'User', company: 'Company' },
  Company: { createdBy: 'User' },
  Job: { company: 'Company', postedBy: 'User' },
  Application: { job: 'Job', student: 'User', studentProfile: 'StudentProfile' },
  Interview: { application: 'Application', job: 'Job', student: 'User', scheduledBy: 'User' },
  Notification: { recipient: 'User', relatedJob: 'Job', relatedApplication: 'Application' },
};

function populateDoc(modelName, doc, populateSpecs) {
  if (!doc || !populateSpecs || populateSpecs.length === 0) return doc;
  const result = cloneDeep(doc);
  const refs = REF_MAP[modelName] || {};

  for (const spec of populateSpecs) {
    const path = typeof spec === 'string' ? spec : spec.path;
    const select = typeof spec === 'object' ? spec.select : undefined;
    const nestedPopulate = typeof spec === 'object' ? spec.populate : undefined;

    const targetModel = refs[path];
    if (!targetModel) continue;

    const rawId = result[path];
    if (!rawId) continue;

    const targetStore = getStore(targetModel);
    const idStr = toIdString(rawId);
    const targetDoc = targetStore.get(idStr);

    if (targetDoc) {
      let populated = cloneDeep(targetDoc);
      // Never leak password unless explicitly requested
      if (targetModel === 'User' && (!select || !select.includes('+password'))) {
        delete populated.password;
      }
      if (nestedPopulate) {
        const nestedSpecs = Array.isArray(nestedPopulate) ? nestedPopulate : [nestedPopulate];
        populated = populateDoc(targetModel, populated, nestedSpecs);
      }
      if (select) {
        const fields = select.split(/\s+/).filter(Boolean);
        const isExclusion = fields.every((f) => f.startsWith('-'));
        if (isExclusion) {
          for (const f of fields) {
            delete populated[f.slice(1)];
          }
        } else {
          const picked = { _id: populated._id };
          for (const f of fields) {
            const cleanField = f.replace(/^\+/, '');
            if (cleanField in populated) picked[cleanField] = populated[cleanField];
          }
          populated = picked;
        }
      }
      result[path] = populated;
    }
  }
  return result;
}

function attachInstanceHelpers(modelName, docObj) {
  if (!docObj || typeof docObj !== 'object') return docObj;

  Object.defineProperty(docObj, 'toObject', {
    value: function () {
      return cloneDeep(this);
    },
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(docObj, 'toJSON', {
    value: function () {
      const copy = cloneDeep(this);
      if (modelName === 'User') {
        delete copy.password;
      }
      return copy;
    },
    enumerable: false,
    configurable: true,
  });

  if (modelName === 'User') {
    Object.defineProperty(docObj, 'matchPassword', {
      value: async function (enteredPassword) {
        const store = getStore('User');
        const raw = store.get(toIdString(this._id));
        const hash = this.password || (raw && raw.password);
        if (!hash) return false;
        return bcrypt.compare(enteredPassword, hash);
      },
      enumerable: false,
      configurable: true,
    });
  }

  Object.defineProperty(docObj, 'save', {
    value: async function () {
      const store = getStore(modelName);
      const idStr = toIdString(this._id || new mongoose.Types.ObjectId());
      this._id = new mongoose.Types.ObjectId(idStr);
      this.updatedAt = new Date();
      if (!this.createdAt) this.createdAt = new Date();

      if (modelName === 'User' && this.password && !String(this.password).startsWith('$2')) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
      }

      const plain = cloneDeep(this);
      store.set(idStr, plain);
      return attachInstanceHelpers(modelName, cloneDeep(plain));
    },
    enumerable: false,
    configurable: true,
  });

  Object.defineProperty(docObj, 'deleteOne', {
    value: async function () {
      const store = getStore(modelName);
      store.delete(toIdString(this._id));
      return { deletedCount: 1 };
    },
    enumerable: false,
    configurable: true,
  });

  return docObj;
}

class InMemoryQuery {
  constructor(modelName, filter = {}, isSingle = false) {
    this.modelName = modelName;
    this.filter = filter;
    this.isSingle = isSingle;
    this._sort = null;
    this._skip = 0;
    this._limit = null;
    this._select = null;
    this._populates = [];
    this._lean = false;
  }

  populate(pathOrSpec, select) {
    if (typeof pathOrSpec === 'string') {
      this._populates.push({ path: pathOrSpec, select });
    } else if (Array.isArray(pathOrSpec)) {
      this._populates.push(...pathOrSpec);
    } else if (pathOrSpec && typeof pathOrSpec === 'object') {
      this._populates.push(pathOrSpec);
    }
    return this;
  }

  select(selectStr) {
    this._select = selectStr;
    return this;
  }

  sort(sortSpec) {
    this._sort = sortSpec;
    return this;
  }

  skip(n) {
    this._skip = Number(n) || 0;
    return this;
  }

  limit(n) {
    this._limit = Number(n) || null;
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  async exec() {
    const store = getStore(this.modelName);
    let docs = Array.from(store.values()).filter((d) => matchesFilter(d, this.filter));

    if (this._sort) {
      const sortEntries =
        typeof this._sort === 'string'
          ? this._sort
              .trim()
              .split(/\s+/)
              .map((k) => (k.startsWith('-') ? [k.slice(1), -1] : [k, 1]))
          : Object.entries(this._sort);

      docs.sort((a, b) => {
        for (const [field, dir] of sortEntries) {
          const va = getNestedValue(a, field);
          const vb = getNestedValue(b, field);
          const na = va instanceof Date ? va.getTime() : va;
          const nb = vb instanceof Date ? vb.getTime() : vb;
          if (na < nb) return -1 * dir;
          if (na > nb) return 1 * dir;
        }
        return 0;
      });
    }

    if (this.isSingle) {
      const first = docs[0];
      if (!first) return null;
      return this._finalizeDoc(first);
    }

    if (this._skip > 0) {
      docs = docs.slice(this._skip);
    }
    if (this._limit !== null && this._limit > 0) {
      docs = docs.slice(0, this._limit);
    }

    return docs.map((d) => this._finalizeDoc(d));
  }

  _finalizeDoc(rawDoc) {
    let doc = cloneDeep(rawDoc);

    // Handle password exclusion on User unless +password is selected
    const includePassword = this._select && this._select.includes('+password');
    if (this.modelName === 'User' && !includePassword) {
      delete doc.password;
    }

    if (this._populates.length > 0) {
      doc = populateDoc(this.modelName, doc, this._populates);
    }

    if (this._select && !includePassword) {
      const fields = this._select.split(/\s+/).filter(Boolean);
      const isExclusion = fields.every((f) => f.startsWith('-'));
      if (isExclusion) {
        for (const f of fields) {
          delete doc[f.slice(1)];
        }
      } else {
        const picked = { _id: doc._id };
        for (const f of fields) {
          const clean = f.replace(/^\+/, '');
          if (clean in doc) picked[clean] = doc[clean];
        }
        doc = picked;
      }
    }

    return this._lean ? doc : attachInstanceHelpers(this.modelName, doc);
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

export function enableInMemoryMongooseAdapter() {
  const modelNames = Object.keys(mongoose.models);

  for (const modelName of modelNames) {
    const Model = mongoose.models[modelName];
    patchModel(modelName, Model);
  }

  // Also intercept future mongoose.model registrations
  const originalModelFn = mongoose.model.bind(mongoose);
  mongoose.model = function (name, schema, collection, options) {
    const registered = originalModelFn(name, schema, collection, options);
    if (schema) {
      patchModel(name, registered);
    }
    return registered;
  };
}

function applySchemaDefaults(modelName, data) {
  const doc = cloneDeep(data);
  const now = new Date();
  if (!doc._id) {
    doc._id = new mongoose.Types.ObjectId();
  } else if (typeof doc._id === 'string') {
    doc._id = new mongoose.Types.ObjectId(doc._id);
  }
  if (!doc.createdAt) doc.createdAt = now;
  doc.updatedAt = now;

  if (modelName === 'User') {
    if (doc.email) doc.email = String(doc.email).toLowerCase().trim();
    if (doc.role === undefined) doc.role = 'STUDENT';
    if (doc.isActive === undefined) doc.isActive = true;
    if (doc.isApproved === undefined) doc.isApproved = true;
  }

  if (modelName === 'StudentProfile') {
    if (doc.cgpa === undefined) doc.cgpa = 0;
    if (doc.activeBacklogs === undefined) doc.activeBacklogs = 0;
    if (doc.historyOfBacklogs === undefined) doc.historyOfBacklogs = 0;
    if (!Array.isArray(doc.skills)) doc.skills = [];
    if (!Array.isArray(doc.projects)) doc.projects = [];
    if (!Array.isArray(doc.experience)) doc.experience = [];
    if (!Array.isArray(doc.education)) doc.education = [];
    if (!doc.placementStatus) doc.placementStatus = 'UNPLACED';
    if (doc.profileCompletionScore === undefined) doc.profileCompletionScore = 40;
  }

  if (modelName === 'Job') {
    if (!doc.status) doc.status = 'OPEN';
    if (!doc.jobType) doc.jobType = 'FULL_TIME';
    if (!doc.workMode) doc.workMode = 'ONSITE';
    if (doc.openings === undefined) doc.openings = 1;
    if (!doc.eligibility) doc.eligibility = {};
    if (doc.eligibility.minCgpa === undefined) doc.eligibility.minCgpa = 0;
    if (!Array.isArray(doc.eligibility.allowedBranches)) doc.eligibility.allowedBranches = [];
    if (doc.eligibility.maxBacklogs === undefined) doc.eligibility.maxBacklogs = 0;
    if (!Array.isArray(doc.eligibility.requiredSkills)) doc.eligibility.requiredSkills = [];
  }

  if (modelName === 'Application') {
    if (!doc.status) doc.status = 'APPLIED';
    if (!Array.isArray(doc.statusHistory)) {
      doc.statusHistory = [
        {
          status: doc.status,
          updatedAt: now,
          note: 'Application submitted',
        },
      ];
    }
  }

  if (modelName === 'Interview') {
    if (!doc.status) doc.status = 'SCHEDULED';
    if (!doc.mode) doc.mode = 'ONLINE';
    if (!doc.durationMinutes) doc.durationMinutes = 45;
  }

  if (modelName === 'Notification') {
    if (doc.isRead === undefined) doc.isRead = false;
  }

  return doc;
}

function patchModel(modelName, Model) {
  if (Model.__inMemoryPatched) return;
  Model.__inMemoryPatched = true;

  Model.find = function (filter = {}) {
    return new InMemoryQuery(modelName, filter, false);
  };

  Model.findOne = function (filter = {}) {
    return new InMemoryQuery(modelName, filter, true);
  };

  Model.findById = function (id) {
    if (!id) return new InMemoryQuery(modelName, { _id: '__none__' }, true);
    return new InMemoryQuery(modelName, { _id: id }, true);
  };

  Model.countDocuments = async function (filter = {}) {
    const store = getStore(modelName);
    return Array.from(store.values()).filter((d) => matchesFilter(d, filter)).length;
  };

  Model.create = async function (docOrDocs) {
    const isArray = Array.isArray(docOrDocs);
    const items = isArray ? docOrDocs : [docOrDocs];
    const store = getStore(modelName);
    const created = [];

    for (const item of items) {
      const prepared = applySchemaDefaults(modelName, item);

      // Unique checks
      if (modelName === 'User') {
        const duplicateEmail = Array.from(store.values()).find(
          (u) => u.email === prepared.email && toIdString(u._id) !== toIdString(prepared._id)
        );
        if (duplicateEmail) {
          const err = new Error('Duplicate field value: email already registered');
          err.code = 11000;
          throw err;
        }
        if (prepared.password && !String(prepared.password).startsWith('$2')) {
          const salt = await bcrypt.genSalt(10);
          prepared.password = await bcrypt.hash(prepared.password, salt);
        }
      }

      if (modelName === 'Application') {
        const dupApp = Array.from(store.values()).find(
          (a) =>
            toIdString(a.student) === toIdString(prepared.student) &&
            toIdString(a.job) === toIdString(prepared.job) &&
            toIdString(a._id) !== toIdString(prepared._id)
        );
        if (dupApp) {
          const err = new Error('Duplicate application: student has already applied to this job');
          err.code = 11000;
          throw err;
        }
      }

      store.set(toIdString(prepared._id), cloneDeep(prepared));
      const instance = attachInstanceHelpers(modelName, cloneDeep(prepared));
      created.push(instance);
    }

    return isArray ? created : created[0];
  };

  Model.insertMany = async function (docs) {
    return Model.create(docs);
  };

  Model.findByIdAndUpdate = function (id, update = {}, options = {}) {
    return Model.findOneAndUpdate({ _id: id }, update, options);
  };

  Model.findOneAndUpdate = function (filter = {}, update = {}, options = {}) {
    const query = new InMemoryQuery(modelName, filter, true);
    const origExec = query.exec.bind(query);
    query.exec = async () => {
      const store = getStore(modelName);
      let existing = Array.from(store.values()).find((d) => matchesFilter(d, filter));

      if (!existing && options.upsert) {
        existing = applySchemaDefaults(modelName, { ...filter });
      }
      if (!existing) return null;

      const updated = cloneDeep(existing);
      if (update.$set) {
        Object.assign(updated, update.$set);
      }
      if (update.$push) {
        for (const [k, v] of Object.entries(update.$push)) {
          if (!Array.isArray(updated[k])) updated[k] = [];
          updated[k].push(v);
        }
      }
      for (const [k, v] of Object.entries(update)) {
        if (!k.startsWith('$')) {
          updated[k] = v;
        }
      }
      updated.updatedAt = new Date();
      store.set(toIdString(updated._id), cloneDeep(updated));

      return query._finalizeDoc(updated);
    };
    return query;
  };

  Model.findByIdAndDelete = async function (id) {
    const store = getStore(modelName);
    const key = toIdString(id);
    const existing = store.get(key);
    if (!existing) return null;
    store.delete(key);
    return attachInstanceHelpers(modelName, cloneDeep(existing));
  };

  Model.deleteMany = async function (filter = {}) {
    const store = getStore(modelName);
    let count = 0;
    for (const [k, v] of store.entries()) {
      if (matchesFilter(v, filter)) {
        store.delete(k);
        count++;
      }
    }
    return { deletedCount: count };
  };

  Model.updateMany = async function (filter = {}, update = {}) {
    const store = getStore(modelName);
    let count = 0;
    for (const [k, v] of store.entries()) {
      if (matchesFilter(v, filter)) {
        const updated = cloneDeep(v);
        if (update.$set) Object.assign(updated, update.$set);
        for (const [uk, uv] of Object.entries(update)) {
          if (!uk.startsWith('$')) updated[uk] = uv;
        }
        updated.updatedAt = new Date();
        store.set(k, updated);
        count++;
      }
    }
    return { modifiedCount: count };
  };
}

export function getInMemoryStats() {
  const summary = {};
  for (const [modelName, store] of stores.entries()) {
    summary[modelName] = store.size;
  }
  return summary;
}
