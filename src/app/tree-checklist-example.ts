import { SelectionModel } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { Component, Injectable } from '@angular/core';
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from '@angular/material/tree';
import { BehaviorSubject } from 'rxjs';

/**
 * Node for Folder
 */
export class FolderNode {
  children: FolderNode[];
  item: string | '';
  id: number;
  type: 'folder' | 'file' | 'unset' | null;
}

/** Flat Folder node with expandable and level information */
export class FolderFlatNode {
  item: string;
  level: number;
  expandable: boolean;
  id: number;
  type: 'folder' | 'file' | 'unset' | null;
}

@Injectable()
export class ChecklistDatabase {
  dataChange = new BehaviorSubject<FolderNode[]>([]);

  get data(): FolderNode[] {
    return this.dataChange.value;
  }

  constructor() {
    this.initialize();
  }

  initialize() {
    const folderData : any = [];
    this.dataChange.next(folderData);
  }

  buildFileTree(obj: { [key: string]: any }, level: number): FolderNode[] {
    return Object.keys(obj).reduce<FolderNode[]>((accumulator, key) => {
      const value = obj[key];
      const node = new FolderNode();
      node.item = key;

      if (value != null) {
        if (typeof value === 'object') {
          node.children = this.buildFileTree(value, level + 1);
        } else {
          node.item = value;
        }
      }

      return accumulator.concat(node);
    }, []);
  }

  /** Add an item to FolderNode */
  insertItem(parent: FolderNode, name: string) {
    if (parent.children) {
      parent.children.push({
        children: [],
        item: name,
        id: new Date().valueOf(),
        type: 'file',
      } as FolderNode);
      this.dataChange.next(this.data);
    }
  }

  insertFolderItem(parent: FolderNode, name: string) {
    if (parent.children) {
      parent.children.push({
        children: [],
        item: name,
        id: new Date().valueOf(),
        type: 'folder',
      });
      this.dataChange.next(this.data);
    }
  }

  /** Delete an item to FolderNode */
  deleteChildItem(parent: FolderNode, name: string) {
    if (parent.children) {
      parent.children = [];
      parent.children.push({ item: name } as FolderNode);
      this.dataChange.next(this.data);
    }
  }

  insertRootItem() {
    this.data.push({
      children: [],
      item: '',
      id: new Date().valueOf(),
      type: 'folder',
    });
    this.dataChange.next(this.data);
  }

  updateItem(node: FolderNode, name: string) {
    node.item = name;
    this.dataChange.next(this.data);
  }

  deleteItem(node: FolderNode | undefined, i : any, isFlateNode: boolean, j?: any) {
    if (isFlateNode) {
      this.dataChange.value[j].children.splice(i, 1);
    } else {
      let index = this.data.findIndex((x) => x.id === node?.id);
      this.data.splice(index, 1);
    }
    this.dataChange.next(this.data);
  }
}


@Component({
  selector: 'tree-checklist-example',
  templateUrl: 'tree-checklist-example.html',
  styleUrls: ['tree-checklist-example.css'],
  providers: [ChecklistDatabase],
})
export class TreeChecklistExample {
  
  flatNodeMap = new Map<FolderFlatNode, FolderNode>();

  nestedNodeMap = new Map<FolderNode, FolderFlatNode>();

  selectedParent: FolderFlatNode | null = null;
  
  newItemName = '';

  treeControl: FlatTreeControl<FolderFlatNode>;

  treeFlattener: MatTreeFlattener<FolderNode, FolderFlatNode>;

  dataSource: MatTreeFlatDataSource<FolderNode, FolderFlatNode>;

  checklistSelection = new SelectionModel<FolderFlatNode>(
    true
  );

  constructor(private _database: ChecklistDatabase) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<FolderFlatNode>(
      this.getLevel,
      this.isExpandable
    );
    this.dataSource = new MatTreeFlatDataSource(
      this.treeControl,
      this.treeFlattener
    );

    _database.dataChange.subscribe((data) => {
      this.dataSource.data = data;
    });
  }

  getLevel = (node: FolderFlatNode) => node.level;

  isExpandable = (node: FolderFlatNode) => node.expandable;

  getChildren = (node: FolderNode): FolderNode[] => node.children;

  hasChild = (_: number, _nodeData: FolderFlatNode) =>
    _nodeData.type === 'folder';

  hasNoContent = (_: number, _nodeData: FolderFlatNode) =>
    _nodeData.item === '';

  transformer = (node: FolderNode, level: number) => {
    const existingNode = this.nestedNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.item === node.item
        ? existingNode
        : new FolderFlatNode();
    flatNode.item = node.item;
    flatNode.id = node.id;
    flatNode.type = node.type;
    flatNode.level = level;
    flatNode.expandable = !!node.children?.length;
    this.flatNodeMap.set(flatNode, node);
    this.nestedNodeMap.set(node, flatNode);
    return flatNode;
  };

  getParentNode(node: FolderFlatNode): FolderFlatNode | null {
    const currentLevel = this.getLevel(node);

    if (currentLevel < 1) {
      return null;
    }

    const startIndex = this.treeControl.dataNodes.indexOf(node) - 1;

    for (let i = startIndex; i >= 0; i--) {
      const currentNode = this.treeControl.dataNodes[i];

      if (this.getLevel(currentNode) < currentLevel) {
        return currentNode;
      }
    }
    return null;
  }

  addNewItem(node: FolderFlatNode) {
    const parentNode = this.flatNodeMap.get(node);
    this._database.insertItem(parentNode!, '');

    this.treeControl.expand(node);
  }

  addNewRoot(node: FolderFlatNode) {
    const parentNode = this.flatNodeMap.get(node);
    this._database.insertFolderItem(parentNode!, '');

    this.treeControl.expand(node);
  }
  deleteItem(node: FolderFlatNode) {
    let parentNode = this.flatNodeMap.get(node);
    let flatNode = [] as any;
    if (this.dataSource.data.length > 0) {
      for (let j = this.dataSource.data.length - 1; j >= 0; j--) {
        flatNode = this.dataSource.data[j].children;
        if (flatNode.length > 0) {
          for (let i = flatNode.length - 1; i >= 0; i--) {
            if (flatNode[i].item === node.item) {
              this._database.deleteItem(flatNode, i, true, j);
            }
          }
        } else {
          this.deleteNode(node);
        }
      }
    } else {
      flatNode = this.dataSource.data[0].children;
      if (flatNode.length > 0) {
        for (let i = flatNode.length - 1; i >= 0; i--) {
          if (flatNode[i].item === node.item) {
            this._database.deleteItem(parentNode, i, true);
          }
        }
      } else {
        this.deleteNode(node);
      }
    }
  }

  addRootItem() {
    this._database.insertRootItem();
  }

  saveNode(node: FolderFlatNode, itemValue: string) {
    const nestedNode = this.flatNodeMap.get(node);
    this._database.updateItem(nestedNode!, itemValue);
  }

  deleteNode(node: FolderFlatNode) {
    const nestedNode = this.flatNodeMap.get(node);
    this._database.deleteItem(nestedNode!, 0, false);
  }

  addNewChildItem(node: FolderFlatNode) {
    const nestedNode = this.flatNodeMap.get(node);
    this._database.insertItem(nestedNode!, '');
    this.treeControl.expand(node);
  }

  deleteNewChildItem(node: FolderFlatNode) {
    const nestedNode = this.flatNodeMap.get(node);
  }
}