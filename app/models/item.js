'use strict';

var Mongo  = require('mongodb'),
    _      = require('lodash'),
    Bid    = require('./bid'),
    async  = require('async');

function Item(userId, o){
  this.name = o.name;
  this.description = o.description;
  this.photo = o.photo;
  this.category = o.category;
  this.tags = o.tags.split(',').map(function(s){return s.trim();});
  this.tags = _.compact(this.tags);
  this.datePosted = new Date();
  this.ownerId = Mongo.ObjectID(userId);

  // private data properties
  this.isAvailable = true;  // item is available in inventory
  this.isOffered = false; // item has been offered to another user to trade & is currently NOT available
}

Object.defineProperty(Item, 'collection', {
  get: function(){return global.mongodb.collection('items');}
});

Item.create = function(id, o, cb){
  console.log('------ MODEL OBJECT ------');
  console.log(o);
  var item = new Item(id, o);
  console.log('------ MODEL ITEM ------');
  console.log(item);
  Item.collection.save(item, cb);
};

Item.findById = function(id, cb){
  var itemId = Mongo.ObjectID(id);
  Item.collection.findOne({_id:itemId}, function(err, item){
    iterator(item, cb);
  });
};

Item.findAllByOwner = function(userId, cb){
  Item.collection.find({ownerId:userId}).toArray(function(err, items){
    async.map(items, getNumBids, cb);
  });
};

Item.browse = function(filter, cb){
  Item.collection.find(filter).toArray(function(err, items){
    async.map(items, iterator, cb);
  });
};

Item.deleteById = function(itemId, cb){
  var _id = Mongo.ObjectID(itemId);
  Item.collection.findAndRemove({_id:_id}, cb);
};

Item.find = function(query, cb){
  var limit = query.limit || 10,
      skip = query.page ? (query.page - 1) * limit : 0,
      filter = {},
      sort = [];

  if(query.filterName === 'userId'){
    query.filterValue = Mongo.ObjectID(query.filterValue);
  }else if(query.filterName === 'description'){
    query.filterValue = new RegExp(query.filterValue);
  }else if(query.filterName === 'name'){
    query.filterValue = new RegExp(query.filterValue);
  }

  filter[query.filterName] = query.filterValue;

  if(query.sort){
    var direction = query.direction ? query.direction * 1 : 1;
    sort.push([query.sort, direction]);
  }

  items.find(filter, {sort:sort, skip:skip, limit:limit}).toArray(function(err, records){
    fn(records);
  });
};

module.exports = Item;

// PRIVATE HELPER FUNCTIONS //

function iterator(item, cb){
  require('./user').findById(item.ownerId, function(err, owner){
    item.loc       = owner.loc;
    item.lat       = owner.lat;
    item.lng       = owner.lng;
    item.ownerName = owner.username;
    cb(null, item);
  });
}

function getNumBids(item, cb){
  Bid.countBids(item._id, function(err, count){
    item.numBids = count;
    cb(null, item);
  });
}
